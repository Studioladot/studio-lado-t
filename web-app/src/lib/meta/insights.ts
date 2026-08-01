import { META_GRAPH_URL } from './oauth'

export type MetaAdInsight = {
  adId: string
  name: string
  campaignName: string
  spend: number
  revenue: number
  purchases: number
  roas: number
  cpa: number
}

export type MetaInsightsResult =
  | { ok: true; ads: MetaAdInsight[]; totalSpend: number; totalRevenue: number }
  | { ok: false; error: string }

type GraphAction = { action_type: string; value: string }
type GraphAd = {
  id: string
  name?: string
  effective_status?: string
  campaign?: { name?: string }
  insights?: { data?: Array<{ spend?: string; action_values?: GraphAction[]; actions?: GraphAction[] }> }
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Trae los anuncios activos de la cuenta conectada con sus insights de los
 * últimos 7 días (mismo cálculo de ROAS/CPA que app.html:dfScan), y calcula
 * los totales. Solo lectura — sin acciones de pausar/escalar todavía; eso
 * queda para cuando podamos probar el flujo completo en vivo.
 */
export async function getMetaAdsInsights(
  token: string,
  accountId: string
): Promise<MetaInsightsResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const until = new Date()
  const since = new Date(Date.now() - 7 * 86400000)

  const fields = `id,name,effective_status,campaign{name},insights.time_range({"since":"${formatDate(since)}","until":"${formatDate(until)}"}){spend,action_values,actions}`

  try {
    // Mismo criterio que metaGraphGet (graph-client.ts) — 20s de caché para
    // evitar pegarle dos veces seguidas a la misma consulta.
    const res = await fetch(
      `${META_GRAPH_URL}/act_${cleanAccountId}/ads?fields=${encodeURIComponent(fields)}&limit=200&access_token=${token}`,
      { next: { revalidate: 20 } }
    )
    const data = await res.json()

    if (data.error) {
      return { ok: false, error: data.error.message ?? 'Error desconocido de Meta.' }
    }

    const activeAds: GraphAd[] = (data.data ?? []).filter(
      (ad: GraphAd) => ad.effective_status === 'ACTIVE'
    )

    const ads: MetaAdInsight[] = activeAds.map((ad) => {
      const insight = ad.insights?.data?.[0] ?? {}
      const spend = Number(insight.spend ?? 0)
      const revenue = Number(
        insight.action_values?.find((a) => a.action_type === 'purchase')?.value ?? 0
      )
      const purchases = Number(
        insight.actions?.find((a) => a.action_type === 'purchase')?.value ?? 0
      )
      const roas = spend > 0 && revenue > 0 ? revenue / spend : 0
      const cpa = purchases > 0 ? spend / purchases : 0

      return {
        adId: ad.id,
        name: ad.name ?? 'Sin nombre',
        campaignName: ad.campaign?.name ?? '—',
        spend,
        revenue,
        purchases,
        roas,
        cpa,
      }
    })

    const totalSpend = ads.reduce((sum, ad) => sum + ad.spend, 0)
    const totalRevenue = ads.reduce((sum, ad) => sum + ad.revenue, 0)

    return { ok: true, ads, totalSpend, totalRevenue }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red.' }
  }
}
