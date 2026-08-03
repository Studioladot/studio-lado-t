import { META_GRAPH_URL } from '@/lib/meta/oauth'

// Fetch histórico "instantáneo" de Insights a nivel cuenta (2026-08-06) — a
// diferencia de instagram-metrics-sync (Edge Function, corre 1 vez al día
// por pg_cron y solo captura el punto del día en que corre), esto pide un
// rango de días de una sola pasada vía since/until, para que una cuenta
// recién conectada tenga curvas reales desde el primer instante en vez de
// esperar hasta 24hs para el primer punto. Mismos nombres de métrica que la
// Edge Function — ninguna cuenta nueva.
const ACCOUNT_METRICS = 'follower_count,reach,impressions,profile_views,total_interactions'
const HISTORY_DAYS = 30

type InsightValue = { name: string; values?: { value: number; end_time?: string }[] }

export type AccountInsightsDay = {
  capturedAt: string
  followerCount: number | null
  reach: number | null
  impressions: number | null
  profileViews: number | null
  totalInteractions: number | null
}

type HistoryResult = { ok: true; days: AccountInsightsDay[] } | { ok: false; error: string }

/** Un punto por día dentro del rango pedido — nunca inventa un valor si Meta no lo devolvió para esa fecha. */
function dailySeries(data: InsightValue[], name: string): Map<string, number> {
  const entry = data.find((d) => d.name === name)
  const map = new Map<string, number>()
  for (const v of entry?.values ?? []) {
    if (typeof v.value === 'number' && v.end_time) map.set(v.end_time.split('T')[0], v.value)
  }
  return map
}

export async function fetchInstagramAccountInsightsHistory(igUserId: string, accessToken: string): Promise<HistoryResult> {
  const until = Math.floor(Date.now() / 1000)
  const since = until - HISTORY_DAYS * 24 * 60 * 60

  try {
    const params = new URLSearchParams({
      metric: ACCOUNT_METRICS,
      period: 'day',
      since: String(since),
      until: String(until),
      access_token: accessToken,
    })
    const res = await fetch(`${META_GRAPH_URL}/${igUserId}/insights?${params}`)
    const json = await res.json()
    if (json.error) {
      // Log server-only con el error CRUDO de Meta (code/type/subcode/
      // fbtrace_id) — nunca llega al cliente, pero es lo único que
      // distingue en los logs de Vercel un token vencido (code 190) de un
      // permiso faltante o un rate limit, en vez de un string genérico.
      console.error('[fetchInstagramAccountInsightsHistory] Graph API respondió con error:', {
        httpStatus: res.status,
        igUserId,
        ...json.error,
      })
      return { ok: false, error: json.error.message ?? 'Error desconocido de Meta.' }
    }

    const data: InsightValue[] = json.data ?? []
    const followerCount = dailySeries(data, 'follower_count')
    const reach = dailySeries(data, 'reach')
    const impressions = dailySeries(data, 'impressions')
    const profileViews = dailySeries(data, 'profile_views')
    const totalInteractions = dailySeries(data, 'total_interactions')

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
