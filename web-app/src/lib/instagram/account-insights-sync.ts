import { META_GRAPH_URL } from '@/lib/meta/oauth'

// Fetch histórico "instantáneo" de Insights a nivel cuenta (2026-08-06) — a
// diferencia de instagram-metrics-sync (Edge Function, corre 1 vez al día
// por pg_cron y solo captura el punto del día en que corre), esto pide un
// rango de días de una sola pasada, para que una cuenta recién conectada
// tenga curvas reales desde el primer instante en vez de esperar hasta
// 24hs para el primer punto.
//
// Tres bugs reales de producción encontrados con el error CRUDO de Meta
// (nunca adivinados):
// 1. "impressions" ya no es una métrica válida en este endpoint — Graph
//    API la reemplazó por "views" (mismo concepto: vistas de contenido de
//    la cuenta). Se sigue guardando en el campo/columna `impressions` de
//    acá para abajo — Meta solo le cambió el nombre.
// 2. "views", "profile_views" y "total_interactions" NO soportan series
//    diarias (period=day) en este endpoint — Meta obliga a pedirlas con
//    metric_type=total_value, que da UN número agregado por llamada, no
//    una serie. "follower_count" y "reach" sí soportan la serie diaria
//    normal. Por eso acá abajo se hacen 2 tipos de pedido: una serie
//    diaria para follower_count/reach, y un total_value POR DÍA (un
//    pedido por día, con concurrencia acotada) para las otras 3 — así se
//    reconstruye el detalle diario real sin inventar ningún valor
//    (nunca se reparte un total del período entre los días).
// 3. (2026-08-06, al subir HISTORY_DAYS de 30 a 90) Meta rechaza un solo
//    pedido de period=day con más de 30 días entre since/until: "There
//    cannot be more than 30 days (2592000 s) between since and until."
//    La serie diaria de follower_count/reach se pide en tandas de ≤30
//    días (fetchTimeSeriesChunked) y se combina, en vez de un solo pedido
//    de 90 días.
//
// La Edge Function instagram-metrics-sync tiene el mismo bug 1 y 2 en su
// bloque de cuenta y necesita el mismo fix + redeploy — no el 3, porque
// esa nunca pide un rango: solo captura el día de la corrida.
const TIME_SERIES_METRICS = 'follower_count,reach'
const TOTAL_VALUE_METRICS = 'views,profile_views,total_interactions'
// 90, no 30 (2026-08-06, bug real reportado: el selector de fechas ofrece
// hasta "Últimos 90 días", pero el sync instantáneo solo traía 30 — más
// allá de eso no había NADA que filtrar, así que 30d/90d mostraban
// exactamente lo mismo. No era un bug de reactividad del picker (el
// filtrado client-side siempre anduvo bien), era que no existía el dato.
// Esto sí triplica los pedidos por día de TOTAL_VALUE_METRICS (90 en vez
// de 30, ver el loop más abajo) — sigue acotado a TOTAL_VALUE_CONCURRENCY
// en paralelo por vez, mismo criterio de no saturar la API de Meta.
const HISTORY_DAYS = 90
const DAY_SECONDS = 24 * 60 * 60
// Subido de 6 a 10 junto con HISTORY_DAYS 30→90 (2026-08-06) — con 90 días
// y concurrencia 6 el loop pasa a 15 tandas secuenciales, un margen real
// contra el timeout de un Server Action en Vercel. 10 en paralelo por vez
// sigue siendo razonable contra la API de Meta y baja a 9 tandas.
const TOTAL_VALUE_CONCURRENCY = 10
// Límite real de Meta para period=day con since/until explícitos —
// confirmado con el error 400: "There cannot be more than 30 days
// (2592000 s) between since and until."
const MAX_SERIES_SPAN_DAYS = 30

type InsightValue = { name: string; values?: { value: number; end_time?: string }[]; total_value?: { value: number } }

export type AccountInsightsDay = {
  capturedAt: string
  followerCount: number | null
  reach: number | null
  impressions: number | null
  profileViews: number | null
  totalInteractions: number | null
}

// code/subcode son enteros chicos de Meta (ej. 190 = token vencido, 100 =
// parámetro inválido) — a diferencia de `message`/`fbtrace_id`, son seguros
// para que lleguen hasta la consola del navegador (no exponen tokens ni
// datos de la cuenta), y le sirven al que está debuggeando para no tener
// que ir a buscar los logs de Vercel por cada intento.
type HistoryResult = { ok: true; days: AccountInsightsDay[] } | { ok: false; error: string; code?: number; subcode?: number }

function logGraphError(context: string, igUserId: string, httpStatus: number, error: { message?: string }) {
  console.error(`[${context}] Graph API respondió con error:`, { httpStatus, igUserId, ...error })
}

/** Un punto por día dentro del rango pedido — nunca inventa un valor si Meta no lo devolvió para esa fecha. */
function dailySeries(data: InsightValue[], name: string): Map<string, number> {
  const entry = data.find((d) => d.name === name)
  const map = new Map<string, number>()
  for (const v of entry?.values ?? []) {
    if (typeof v.value === 'number' && v.end_time) map.set(v.end_time.split('T')[0], v.value)
  }
  return map
}

function pickTotalValue(data: InsightValue[], name: string): number | null {
  const value = data.find((d) => d.name === name)?.total_value?.value
  return typeof value === 'number' ? value : null
}

type SeriesChunkResult =
  | { ok: true; followerCount: Map<string, number>; reach: Map<string, number> }
  | { ok: false; error: string; code?: number; subcode?: number }

/**
 * Serie diaria de follower_count/reach en tandas de ≤MAX_SERIES_SPAN_DAYS
 * — Meta rechaza un solo pedido de period=day con un since/until más
 * ancho que eso (error 400 real, ver comentario de cabecera del
 * archivo). Para HISTORY_DAYS=90 son 3 pedidos secuenciales en vez de
 * uno solo de 90 días.
 */
async function fetchTimeSeriesChunked(igUserId: string, accessToken: string, since: number, until: number): Promise<SeriesChunkResult> {
  const followerCount = new Map<string, number>()
  const reach = new Map<string, number>()

  for (let chunkStart = since; chunkStart < until; chunkStart += MAX_SERIES_SPAN_DAYS * DAY_SECONDS) {
    const chunkEnd = Math.min(chunkStart + MAX_SERIES_SPAN_DAYS * DAY_SECONDS, until)
    const params = new URLSearchParams({
      metric: TIME_SERIES_METRICS,
      period: 'day',
      since: String(chunkStart),
      until: String(chunkEnd),
      access_token: accessToken,
    })
    const res = await fetch(`${META_GRAPH_URL}/${igUserId}/insights?${params}`)
    const json = await res.json()
    if (json.error) {
      logGraphError('fetchInstagramAccountInsightsHistory:series', igUserId, res.status, json.error)
      return {
        ok: false,
        error: json.error.message ?? 'Error desconocido de Meta.',
        code: typeof json.error.code === 'number' ? json.error.code : undefined,
        subcode: typeof json.error.error_subcode === 'number' ? json.error.error_subcode : undefined,
      }
    }
    const data: InsightValue[] = json.data ?? []
    for (const [date, value] of dailySeries(data, 'follower_count')) followerCount.set(date, value)
    for (const [date, value] of dailySeries(data, 'reach')) reach.set(date, value)
  }

  return { ok: true, followerCount, reach }
}

export async function fetchInstagramAccountInsightsHistory(igUserId: string, accessToken: string): Promise<HistoryResult> {
  // Alineado a límites de día calendario (medianoche UTC), no a "ahora menos
  // 30 días" — así cada bucket de total_value representa un día calendario
  // real y coincide con las fechas que ya devuelve la serie de tiempo
  // (end_time) y con `captured_at` (columna `date`) del resto del esquema.
  const now = new Date()
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000
  const until = todayStart + DAY_SECONDS
  const since = until - HISTORY_DAYS * DAY_SECONDS

  try {
    const seriesResult = await fetchTimeSeriesChunked(igUserId, accessToken, since, until)
    if (!seriesResult.ok) return seriesResult

    const { followerCount, reach } = seriesResult

    // views/profile_views/total_interactions: un total_value por día,
    // acotado a TOTAL_VALUE_CONCURRENCY en paralelo por vez (30 llamadas
    // sueltas en simultáneo sería agresivo contra la API de Meta). Un día
    // puntual que falle no frena el resto — mismo criterio de aislamiento
    // de fallos que ya usa el resto de las sincronizaciones de Gotix.
    const dayStarts: number[] = []
    for (let d = since; d < until; d += DAY_SECONDS) dayStarts.push(d)

    const impressions = new Map<string, number>()
    const profileViews = new Map<string, number>()
    const totalInteractions = new Map<string, number>()
    // Diagnóstico de una sola vez (no por día, para no inundar los logs):
    // si Meta responde ok pero sin ningún total_value reconocible, algo en
    // la forma de la respuesta no es la esperada — mejor verlo una vez acá
    // que repetir otra ronda de "sigue vacío, no sé por qué".
    let loggedEmptyShape = false

    for (let i = 0; i < dayStarts.length; i += TOTAL_VALUE_CONCURRENCY) {
      const chunk = dayStarts.slice(i, i + TOTAL_VALUE_CONCURRENCY)
      const results = await Promise.all(
        chunk.map(async (dayStart) => {
          const date = new Date(dayStart * 1000).toISOString().split('T')[0]
          const params = new URLSearchParams({
            metric: TOTAL_VALUE_METRICS,
            metric_type: 'total_value',
            period: 'day',
            since: String(dayStart),
            until: String(dayStart + DAY_SECONDS),
            access_token: accessToken,
          })
          const res = await fetch(`${META_GRAPH_URL}/${igUserId}/insights?${params}`)
          const json = await res.json()
          return { date, res, json }
        })
      )

      for (const { date, res, json } of results) {
        if (json.error) {
          logGraphError('fetchInstagramAccountInsightsHistory:total_value', igUserId, res.status, json.error)
          continue
        }
        const data: InsightValue[] = json.data ?? []
        // "views" es el nombre real que pide la Graph API — se guarda en
        // el campo `impressions` de acá para abajo (ver comentario de
        // cabecera de este archivo).
        const views = pickTotalValue(data, 'views')
        if (views !== null) impressions.set(date, views)
        const pv = pickTotalValue(data, 'profile_views')
        if (pv !== null) profileViews.set(date, pv)
        const ti = pickTotalValue(data, 'total_interactions')
        if (ti !== null) totalInteractions.set(date, ti)

        if (views === null && pv === null && ti === null && !loggedEmptyShape) {
          loggedEmptyShape = true
          console.error('[fetchInstagramAccountInsightsHistory] total_value sin datos reconocibles para', date, '— respuesta cruda de Meta:', json)
        }
      }
    }

    const allDates = new Set<string>([
      ...followerCount.keys(),
      ...reach.keys(),
      ...impressions.keys(),
      ...profileViews.keys(),
      ...totalInteractions.keys(),
    ])

    const days: AccountInsightsDay[] = [...allDates].sort().map((date) => ({
      capturedAt: date,
      followerCount: followerCount.get(date) ?? null,
      reach: reach.get(date) ?? null,
      impressions: impressions.get(date) ?? null,
      profileViews: profileViews.get(date) ?? null,
      totalInteractions: totalInteractions.get(date) ?? null,
    }))

    return { ok: true, days }
  } catch (err) {
    console.error('[fetchInstagramAccountInsightsHistory] excepción de red o parseo:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red.' }
  }
}
