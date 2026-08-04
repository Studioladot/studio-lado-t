import { META_GRAPH_URL } from '@/lib/meta/oauth'

// Fetch histórico "instantáneo" de Insights a nivel cuenta (2026-08-06) — a
// diferencia de instagram-metrics-sync (Edge Function, corre 1 vez al día
// por pg_cron y solo captura el punto del día en que corre), esto pide un
// rango de días de una sola pasada, para que una cuenta recién conectada
// tenga curvas reales desde el primer instante en vez de esperar hasta
// 24hs para el primer punto.
//
// Dos bugs reales de producción encontrados con el error CRUDO de Meta
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
//
// La Edge Function instagram-metrics-sync tiene el mismo bug 1 y 2 en su
// bloque de cuenta y necesita el mismo fix + redeploy.
const TIME_SERIES_METRICS = 'follower_count,reach'
const TOTAL_VALUE_METRICS = 'views,profile_views,total_interactions'
const HISTORY_DAYS = 30
const DAY_SECONDS = 24 * 60 * 60
const TOTAL_VALUE_CONCURRENCY = 6

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
    const seriesParams = new URLSearchParams({
      metric: TIME_SERIES_METRICS,
      period: 'day',
      since: String(since),
      until: String(until),
      access_token: accessToken,
    })
    const seriesRes = await fetch(`${META_GRAPH_URL}/${igUserId}/insights?${seriesParams}`)
    const seriesJson = await seriesRes.json()
    if (seriesJson.error) {
      logGraphError('fetchInstagramAccountInsightsHistory:series', igUserId, seriesRes.status, seriesJson.error)
      return {
        ok: false,
        error: seriesJson.error.message ?? 'Error desconocido de Meta.',
        code: typeof seriesJson.error.code === 'number' ? seriesJson.error.code : undefined,
        subcode: typeof seriesJson.error.error_subcode === 'number' ? seriesJson.error.error_subcode : undefined,
      }
    }

    const seriesData: InsightValue[] = seriesJson.data ?? []
    const followerCount = dailySeries(seriesData, 'follower_count')
    const reach = dailySeries(seriesData, 'reach')

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

    for (let i = 0; i < dayStarts.length; i += TOTAL_VALUE_CONCURRENCY) {
      const chunk = dayStarts.slice(i, i + TOTAL_VALUE_CONCURRENCY)
      const results = await Promise.all(
        chunk.map(async (dayStart) => {
          const date = new Date(dayStart * 1000).toISOString().split('T')[0]
          const params = new URLSearchParams({
            metric: TOTAL_VALUE_METRICS,
            metric_type: 'total_value',
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
