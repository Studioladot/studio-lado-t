import { metaGraphGet, metaGraphPost, metaGraphPostRaw, type MetaMutationResult, type MetaCreateResult } from './graph-client'

export type { MetaMutationResult, MetaCreateResult }

type GraphAction = { action_type: string; value: string }
type GraphInsight = {
  spend?: string
  impressions?: string
  ctr?: string
  cpm?: string
  cpc?: string
  frequency?: string
  inline_link_clicks?: string
  action_values?: GraphAction[]
  actions?: GraphAction[]
  video_play_actions?: GraphAction[]
  /** Solo viene cuando el insight se pide con time_increment(1) — un valor por fila/día. */
  date_start?: string
}

// Mismos action_type que app.html:10564-10565 (con el mismo fallback al
// nombre viejo de offsite_conversion — cuentas con pixels configurados hace
// tiempo todavía reportan bajo ese nombre en vez del estándar nuevo).
const ATC_ACTION_TYPES = ['add_to_cart', 'offsite_conversion.fb_pixel_add_to_cart']
const IC_ACTION_TYPES = ['initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout']

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function insightsWindow(days: number) {
  const until = new Date()
  const since = new Date(Date.now() - days * 86400000)
  return `{"since":"${formatDate(since)}","until":"${formatDate(until)}"}`
}

function rangeWindow(since: Date, until: Date) {
  return `{"since":"${formatDate(since)}","until":"${formatDate(until)}"}`
}

// Mismo cálculo que app.html (parseInsights + META_METRIC_DEFS, líneas ~10567
// y 6606-6618): hook_rate = video_view (3s) / impresiones * 100, CPA =
// gasto / compras. CTR y CPM vienen ya calculados por la Graph API.
export function computeMetrics(insight: GraphInsight | undefined) {
  const spend = Number(insight?.spend ?? 0)
  const impressions = Number(insight?.impressions ?? 0)
  const revenue = Number(insight?.action_values?.find((a) => a.action_type === 'purchase')?.value ?? 0)
  const purchases = Number(insight?.actions?.find((a) => a.action_type === 'purchase')?.value ?? 0)
  const videoViews = Number(insight?.video_play_actions?.find((a) => a.action_type === 'video_view')?.value ?? 0)
  const initiateCheckout = Number(insight?.actions?.find((a) => IC_ACTION_TYPES.includes(a.action_type))?.value ?? 0)
  const addToCart = Number(insight?.actions?.find((a) => ATC_ACTION_TYPES.includes(a.action_type))?.value ?? 0)

  const roas = spend > 0 && revenue > 0 ? revenue / spend : 0
  const cpa = purchases > 0 ? spend / purchases : 0
  const ctr = Number(insight?.ctr ?? 0)
  const cpm = Number(insight?.cpm ?? 0)
  // cpc/frequency vienen calculados por Meta (app.html:10579-10580, campo
  // directo — no derivados a mano como cpa/costPerIC/costPerATC/aov, que no
  // existen como campo nativo de la Graph API).
  const cpc = Number(insight?.cpc ?? 0)
  const frequency = Number(insight?.frequency ?? 0)
  const linkClicks = Number(insight?.inline_link_clicks ?? 0)
  const hookRate = impressions > 0 ? Math.round((videoViews / impressions) * 1000) / 10 : 0
  const costPerIC = initiateCheckout > 0 ? spend / initiateCheckout : 0
  const costPerATC = addToCart > 0 ? spend / addToCart : 0
  const aov = purchases > 0 ? revenue / purchases : 0

  return {
    spend,
    revenue,
    purchases,
    roas,
    cpa,
    ctr,
    cpm,
    impressions,
    hookRate,
    cpc,
    frequency,
    linkClicks,
    initiateCheckout,
    addToCart,
    costPerIC,
    costPerATC,
    aov,
  }
}

// Set de métricas común a Campañas/Conjuntos/Anuncios — MetaCampaign, MetaAdSet
// y MetaCampaignAd son todos un superset de esto, así que metric-defs.tsx puede
// definir un solo METRIC_COLUMNS reutilizado en los 3 niveles (ver app.html:
// META_METRIC_DEFS, un único set compartido entre los 3 niveles del legado).
export type MetaMetrics = ReturnType<typeof computeMetrics>

// ---------------------------------------------------------------------------
// Gasto/ventas agregados de toda la cuenta en un rango arbitrario — Dashboard
// de Rentabilidad Neta (2026-07-25), usado para comparar el período actual
// contra el inmediatamente anterior (Insights Automáticos de CPA/AOV). A
// diferencia de insightsWindow(days), que siempre cuenta hacia atrás desde
// "hoy", acá el rango es explícito porque el "período anterior" no termina hoy.
// ---------------------------------------------------------------------------

export type MetaAccountSpend = {
  spend: number
  revenue: number
  impressions: number
  linkClicks: number
  purchases: number
  addToCart: number
  initiateCheckout: number
}

export type MetaAccountSpendResult = { ok: true; spend: MetaAccountSpend } | { ok: false; error: string }

export async function getMetaAccountSpendForRange(
  token: string,
  accountId: string,
  since: Date,
  until: Date
): Promise<MetaAccountSpendResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const result = await metaGraphGet<{ data?: GraphInsight[] }>(
    `/act_${cleanAccountId}/insights?time_range=${encodeURIComponent(rangeWindow(since, until))}&fields=spend,impressions,inline_link_clicks,action_values,actions`,
    token
  )
  if (!result.ok) return result

  const insight = result.data.data?.[0]
  const spend = Number(insight?.spend ?? 0)
  const revenue = Number(insight?.action_values?.find((a) => a.action_type === 'purchase')?.value ?? 0)
  const impressions = Number(insight?.impressions ?? 0)
  const linkClicks = Number(insight?.inline_link_clicks ?? 0)
  const purchases = Number(insight?.actions?.find((a) => a.action_type === 'purchase')?.value ?? 0)
  const addToCart = Number(insight?.actions?.find((a) => ATC_ACTION_TYPES.includes(a.action_type))?.value ?? 0)
  const initiateCheckout = Number(insight?.actions?.find((a) => IC_ACTION_TYPES.includes(a.action_type))?.value ?? 0)

  return { ok: true, spend: { spend, revenue, impressions, linkClicks, purchases, addToCart, initiateCheckout } }
}

// ---------------------------------------------------------------------------
// Listado de campañas
// ---------------------------------------------------------------------------

export type MetaCampaign = {
  id: string
  name: string
  status: string
  effectiveStatus: string
  objective: string
  dailyBudget: number | null
  lifetimeBudget: number | null
  createdAt: string | null
  spend: number
  revenue: number
  purchases: number
  roas: number
  cpa: number
  ctr: number
  cpm: number
  impressions: number
  hookRate: number
  cpc: number
  frequency: number
  linkClicks: number
  initiateCheckout: number
  addToCart: number
  costPerIC: number
  costPerATC: number
  aov: number
}

export type MetaCampaignsResult = { ok: true; campaigns: MetaCampaign[] } | { ok: false; error: string }

type GraphCampaign = {
  id: string
  name?: string
  status?: string
  effective_status?: string
  objective?: string
  daily_budget?: string
  lifetime_budget?: string
  created_time?: string
  insights?: { data?: GraphInsight[] }
}

/**
 * Trae las campañas de la cuenta conectada con sus insights de los últimos
 * `days` días (30 por defecto — a nivel campaña interesa una ventana más
 * amplia que los 7 días que usa el resumen de anuncios del dashboard) y
 * calcula gasto/ROAS por campaña. Solo lectura, mismo contrato ok/error que
 * getMetaAdsInsights.
 */
export async function getMetaCampaigns(token: string, accountId: string, days = 30): Promise<MetaCampaignsResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const fields = `id,name,status,effective_status,objective,daily_budget,lifetime_budget,created_time,insights.time_range(${insightsWindow(days)}){spend,impressions,ctr,cpm,cpc,frequency,inline_link_clicks,action_values,actions,video_play_actions}`

  const result = await metaGraphGet<{ data?: GraphCampaign[] }>(
    `/act_${cleanAccountId}/campaigns?fields=${encodeURIComponent(fields)}&limit=200`,
    token
  )
  if (!result.ok) return result

  const campaigns: MetaCampaign[] = (result.data.data ?? []).map((c) => {
    const metrics = computeMetrics(c.insights?.data?.[0])
    return {
      id: c.id,
      name: c.name ?? 'Sin nombre',
      status: c.status ?? 'UNKNOWN',
      effectiveStatus: c.effective_status ?? c.status ?? 'UNKNOWN',
      objective: c.objective ?? '—',
      dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
      lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
      createdAt: c.created_time ?? null,
      ...metrics,
    }
  })

  campaigns.sort((a, b) => b.spend - a.spend)

  return { ok: true, campaigns }
}

// ---------------------------------------------------------------------------
// Detalle de una campaña (header + ad sets + ads)
// ---------------------------------------------------------------------------

export type MetaCampaignHeader = {
  id: string
  name: string
  status: string
  effectiveStatus: string
  objective: string
  dailyBudget: number | null
  lifetimeBudget: number | null
}

export type MetaCampaignHeaderResult = { ok: true; campaign: MetaCampaignHeader } | { ok: false; error: string }

export async function getMetaCampaignHeader(token: string, campaignId: string): Promise<MetaCampaignHeaderResult> {
  const result = await metaGraphGet<{
    id: string
    name?: string
    status?: string
    effective_status?: string
    objective?: string
    daily_budget?: string
    lifetime_budget?: string
  }>(`/${campaignId}?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget`, token)
  if (!result.ok) return result

  const c = result.data
  return {
    ok: true,
    campaign: {
      id: c.id,
      name: c.name ?? 'Sin nombre',
      status: c.status ?? 'UNKNOWN',
      effectiveStatus: c.effective_status ?? c.status ?? 'UNKNOWN',
      objective: c.objective ?? '—',
      dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
      lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
    },
  }
}

// ---------------------------------------------------------------------------
// Snapshots — historial día por día de UN anuncio o conjunto puntual
// (2026-08-03). time_increment(1) sobre un solo id es el mismo patrón ya
// probado en autopilot-run/index.ts (ahí consumido en memoria nomás, nunca
// expuesto a la UI) — acá se pide en vivo cada vez que el usuario elige una
// entidad, sin tabla nueva ni cron: no hay que esperar a que se acumule
// historial, el primer día que se abre la pantalla ya hay datos reales.
// Funciona igual para un ad_id o un adset_id — el endpoint de Graph API es
// el mismo (GET /{id}?fields=...insights...), no hace falta distinguir tipo.
// ---------------------------------------------------------------------------

// Snapshots Pro (2026-08-04) — "métricas profundas" pedidas por la PO:
// CTR/CPC/Frecuencia/Impresiones se agregan al punto diario (computeMetrics
// ya las calculaba, solo faltaba llevarlas hasta acá). Deliberadamente NO
// se agrega breakdown horario (hourly_stats_aggregated_by_advertiser_time_zone)
// en esta ronda — es un parámetro de Graph API distinto a time_increment,
// con su propio costo de llamadas y complejidad de UI; "seguimiento riguroso
// diario" queda cubierto por el set de métricas de abajo, horario queda
// como una ampliación futura si se pide explícitamente.
export type MetaEntityDailyPoint = {
  date: string
  spend: number
  revenue: number
  purchases: number
  roas: number
  cpa: number
  ctr: number
  cpc: number
  frequency: number
  impressions: number
}

export type MetaEntityDailyInsightsResult =
  | { ok: true; entityName: string; days: MetaEntityDailyPoint[] }
  | { ok: false; error: string }

/**
 * `range` es un rango de fechas libre (Selector de Fechas Personalizado,
 * Snapshots Pro 2026-08-04) — reemplaza el parámetro `days` original.
 * rangeWindow ya existía (la usa getMetaAccountSpendForRange), mismo
 * formato que insightsWindow, solo que con fechas explícitas en vez de
 * "hoy menos N días".
 */
export async function getMetaEntityDailyInsights(
  token: string,
  entityId: string,
  range: { since: Date; until: Date }
): Promise<MetaEntityDailyInsightsResult> {
  const fields = `name,insights.time_range(${rangeWindow(range.since, range.until)}).time_increment(1){date_start,spend,impressions,ctr,cpc,frequency,action_values,actions}`

  const result = await metaGraphGet<{ name?: string; insights?: { data?: GraphInsight[] } }>(
    `/${entityId}?fields=${encodeURIComponent(fields)}`,
    token
  )
  if (!result.ok) return result

  const rows = result.data.insights?.data ?? []
  const dayPoints: MetaEntityDailyPoint[] = rows
    .map((row) => {
      const m = computeMetrics(row)
      return {
        date: row.date_start ?? '',
        spend: m.spend,
        revenue: m.revenue,
        purchases: m.purchases,
        roas: m.roas,
        cpa: m.cpa,
        ctr: m.ctr,
        cpc: m.cpc,
        frequency: m.frequency,
        impressions: m.impressions,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  return { ok: true, entityName: result.data.name ?? 'Sin nombre', days: dayPoints }
}

export type MetaAdSet = {
  id: string
  name: string
  status: string
  effectiveStatus: string
  dailyBudget: number | null
  lifetimeBudget: number | null
  createdAt: string | null
} & ReturnType<typeof computeMetrics>

export type MetaAdSetsResult = { ok: true; adSets: MetaAdSet[] } | { ok: false; error: string }

type GraphAdSet = {
  id: string
  name?: string
  status?: string
  effective_status?: string
  daily_budget?: string
  lifetime_budget?: string
  created_time?: string
  insights?: { data?: GraphInsight[] }
}

export async function getMetaCampaignAdSets(token: string, campaignId: string, days = 30): Promise<MetaAdSetsResult> {
  // Mismo set de insights que getMetaCampaigns — necesario para que Conjuntos
  // tenga las mismas 17 métricas disponibles que Campañas (ver metric-defs.tsx).
  const fields = `id,name,status,effective_status,daily_budget,lifetime_budget,created_time,insights.time_range(${insightsWindow(days)}){spend,impressions,ctr,cpm,cpc,frequency,inline_link_clicks,action_values,actions,video_play_actions}`

  const result = await metaGraphGet<{ data?: GraphAdSet[] }>(
    `/${campaignId}/adsets?fields=${encodeURIComponent(fields)}&limit=200`,
    token
  )
  if (!result.ok) return result

  const adSets: MetaAdSet[] = (result.data.data ?? []).map((a) => ({
    id: a.id,
    name: a.name ?? 'Sin nombre',
    status: a.status ?? 'UNKNOWN',
    effectiveStatus: a.effective_status ?? a.status ?? 'UNKNOWN',
    dailyBudget: a.daily_budget ? Number(a.daily_budget) / 100 : null,
    lifetimeBudget: a.lifetime_budget ? Number(a.lifetime_budget) / 100 : null,
    createdAt: a.created_time ?? null,
    ...computeMetrics(a.insights?.data?.[0]),
  }))

  adSets.sort((a, b) => b.spend - a.spend)

  return { ok: true, adSets }
}

export type MetaCampaignAd = {
  id: string
  name: string
  adSetName: string
  status: string
  effectiveStatus: string
  creativeTitle: string | null
  creativeBody: string | null
  thumbnailUrl: string | null
  createdAt: string | null
} & ReturnType<typeof computeMetrics>

export type MetaCampaignAdsResult = { ok: true; ads: MetaCampaignAd[] } | { ok: false; error: string }

type GraphCreative = { title?: string; body?: string; thumbnail_url?: string }
type GraphCampaignAd = {
  id: string
  name?: string
  status?: string
  effective_status?: string
  adset?: { name?: string }
  creative?: GraphCreative
  created_time?: string
  insights?: { data?: GraphInsight[] }
}

// Mismo set de insights que getMetaCampaigns/getMetaCampaignAdSets — Anuncios
// tiene que tener las mismas 17 métricas disponibles que Campañas y Conjuntos.
const AD_FIELDS =
  'id,name,status,effective_status,adset{name},creative{title,body,thumbnail_url},created_time,insights.time_range(WINDOW){spend,impressions,ctr,cpm,cpc,frequency,inline_link_clicks,action_values,actions,video_play_actions}'

function mapGraphAd(a: GraphCampaignAd): MetaCampaignAd {
  const metrics = computeMetrics(a.insights?.data?.[0])
  return {
    id: a.id,
    name: a.name ?? 'Sin nombre',
    adSetName: a.adset?.name ?? '—',
    status: a.status ?? 'UNKNOWN',
    effectiveStatus: a.effective_status ?? a.status ?? 'UNKNOWN',
    creativeTitle: a.creative?.title ?? null,
    creativeBody: a.creative?.body ?? null,
    thumbnailUrl: a.creative?.thumbnail_url ?? null,
    createdAt: a.created_time ?? null,
    ...metrics,
  }
}

export async function getMetaCampaignAds(token: string, campaignId: string, days = 30): Promise<MetaCampaignAdsResult> {
  const fields = AD_FIELDS.replace('WINDOW', insightsWindow(days))

  const result = await metaGraphGet<{ data?: GraphCampaignAd[] }>(
    `/${campaignId}/ads?fields=${encodeURIComponent(fields)}&limit=200`,
    token
  )
  if (!result.ok) return result

  const ads = (result.data.data ?? []).map(mapGraphAd)
  ads.sort((a, b) => b.spend - a.spend)

  return { ok: true, ads }
}

// ---------------------------------------------------------------------------
// Nombres livianos, sin insights (2026-08-06) — para selectores donde solo
// hace falta poblar un <select> con id+nombre (Snapshots), no las 17
// métricas completas que traen getMetaCampaigns/getMetaCampaignAdSets/
// getMetaCampaignAds. Pedir insights.time_range(...) por cada campaña/
// conjunto/anuncio solo para descartarlos es el tipo de llamado redundante
// que infla la carga inicial sin aportar nada a la pantalla.
// ---------------------------------------------------------------------------

export type MetaEntityName = { id: string; name: string }
export type MetaEntityNamesResult = { ok: true; entities: MetaEntityName[] } | { ok: false; error: string }

export async function getMetaCampaignNames(token: string, accountId: string): Promise<MetaEntityNamesResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const result = await metaGraphGet<{ data?: Array<{ id: string; name?: string }> }>(
    `/act_${cleanAccountId}/campaigns?fields=id,name&limit=200`,
    token
  )
  if (!result.ok) return result
  return { ok: true, entities: (result.data.data ?? []).map((c) => ({ id: c.id, name: c.name ?? 'Sin nombre' })) }
}

export async function getMetaCampaignEntityNames(
  token: string,
  campaignId: string,
  level: 'adset' | 'ad'
): Promise<MetaEntityNamesResult> {
  const edge = level === 'adset' ? 'adsets' : 'ads'
  const result = await metaGraphGet<{ data?: Array<{ id: string; name?: string }> }>(
    `/${campaignId}/${edge}?fields=id,name&limit=200`,
    token
  )
  if (!result.ok) return result
  return { ok: true, entities: (result.data.data ?? []).map((a) => ({ id: a.id, name: a.name ?? 'Sin nombre' })) }
}

// ---------------------------------------------------------------------------
// Cuenta completa — Biblioteca de Ads, pestaña "Activos en Meta" (2026-07-25).
// Mismo mapGraphAd/AD_FIELDS que getMetaCampaignAds, a nivel /act_{id}/ads
// en vez de acotado a una campaña, más el nombre de campaña (que a nivel
// campaña ya se conoce por contexto y acá hace falta pedir explícito).
// ---------------------------------------------------------------------------

export type MetaAccountAd = MetaCampaignAd & { campaignId: string | null; campaignName: string }
export type MetaAccountAdsResult = { ok: true; ads: MetaAccountAd[] } | { ok: false; error: string }

type GraphAccountAd = GraphCampaignAd & { campaign?: { id?: string; name?: string } }

const ACCOUNT_AD_FIELDS =
  'id,name,status,effective_status,adset{name},campaign{id,name},creative{title,body,thumbnail_url},created_time,insights.time_range(WINDOW){spend,impressions,ctr,cpm,cpc,frequency,inline_link_clicks,action_values,actions,video_play_actions}'

function mapGraphAccountAd(a: GraphAccountAd): MetaAccountAd {
  return { ...mapGraphAd(a), campaignId: a.campaign?.id ?? null, campaignName: a.campaign?.name ?? '—' }
}

/** Solo ACTIVE/PAUSED — un anuncio archivado/borrado no es "inventario en producción", es historia vieja que no aporta a la decisión de qué lanzar. */
export async function getMetaAccountAds(token: string, accountId: string, days = 30): Promise<MetaAccountAdsResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const fields = ACCOUNT_AD_FIELDS.replace('WINDOW', insightsWindow(days))

  const result = await metaGraphGet<{ data?: GraphAccountAd[] }>(
    `/act_${cleanAccountId}/ads?fields=${encodeURIComponent(fields)}&effective_status=["ACTIVE","PAUSED"]&limit=200`,
    token
  )
  if (!result.ok) return result

  const ads = (result.data.data ?? []).map(mapGraphAccountAd)
  ads.sort((a, b) => b.spend - a.spend)

  return { ok: true, ads }
}

/**
 * Trae anuncios puntuales por ID (no por campaña) — usado por el Comparador
 * de Anuncios, que puede recibir IDs de distintos ad sets de una misma
 * campaña. Usa el endpoint de batch-by-id de la Graph API (`/?ids=...`).
 */
export async function getMetaAdsByIds(token: string, adIds: string[], days = 30): Promise<MetaCampaignAdsResult> {
  if (adIds.length === 0) return { ok: true, ads: [] }

  const fields = AD_FIELDS.replace('WINDOW', insightsWindow(days))
  const result = await metaGraphGet<Record<string, GraphCampaignAd>>(
    `/?ids=${adIds.map(encodeURIComponent).join(',')}&fields=${encodeURIComponent(fields)}`,
    token
  )
  if (!result.ok) return result

  const ads = Object.values(result.data).map(mapGraphAd)
  return { ok: true, ads }
}

/**
 * Trae conjuntos puntuales por ID (no por campaña) — usado por el Comparador
 * de Conjuntos, mismo patrón que getMetaAdsByIds.
 */
export async function getMetaAdSetsByIds(token: string, adSetIds: string[], days = 30): Promise<MetaAdSetsResult> {
  if (adSetIds.length === 0) return { ok: true, adSets: [] }

  const fields = `id,name,status,effective_status,daily_budget,lifetime_budget,created_time,insights.time_range(${insightsWindow(days)}){spend,impressions,ctr,cpm,cpc,frequency,inline_link_clicks,action_values,actions,video_play_actions}`
  const result = await metaGraphGet<Record<string, GraphAdSet>>(
    `/?ids=${adSetIds.map(encodeURIComponent).join(',')}&fields=${encodeURIComponent(fields)}`,
    token
  )
  if (!result.ok) return result

  const adSets: MetaAdSet[] = Object.values(result.data).map((a) => ({
    id: a.id,
    name: a.name ?? 'Sin nombre',
    status: a.status ?? 'UNKNOWN',
    effectiveStatus: a.effective_status ?? a.status ?? 'UNKNOWN',
    dailyBudget: a.daily_budget ? Number(a.daily_budget) / 100 : null,
    lifetimeBudget: a.lifetime_budget ? Number(a.lifetime_budget) / 100 : null,
    createdAt: a.created_time ?? null,
    ...computeMetrics(a.insights?.data?.[0]),
  }))

  return { ok: true, adSets }
}

// ---------------------------------------------------------------------------
// Mutaciones — escriben contra la cuenta real de Meta Ads
// ---------------------------------------------------------------------------

/** Pausa o reactiva una campaña a nivel top-level (status ACTIVE/PAUSED). */
export async function updateMetaCampaignStatus(
  token: string,
  campaignId: string,
  status: 'ACTIVE' | 'PAUSED'
): Promise<MetaMutationResult> {
  return metaGraphPost(`/${campaignId}`, token, { status })
}

/** Pausa o reactiva un conjunto de anuncios — mismo endpoint que a nivel campaña. */
export async function updateMetaAdSetStatus(
  token: string,
  adSetId: string,
  status: 'ACTIVE' | 'PAUSED'
): Promise<MetaMutationResult> {
  return metaGraphPost(`/${adSetId}`, token, { status })
}

/** Pausa o reactiva un anuncio — mismo endpoint que a nivel campaña/conjunto. */
export async function updateMetaAdStatus(
  token: string,
  adId: string,
  status: 'ACTIVE' | 'PAUSED'
): Promise<MetaMutationResult> {
  return metaGraphPost(`/${adId}`, token, { status })
}

/**
 * Cambia el presupuesto de campaña (solo aplica cuando la campaña tiene
 * Campaign Budget Optimization activado, es decir ya tiene daily_budget o
 * lifetime_budget seteado a ese nivel — si el presupuesto vive en los ad
 * sets, esto no aplica y la UI no debe ofrecer editarlo acá).
 */
export async function updateMetaCampaignBudget(
  token: string,
  campaignId: string,
  budget: { dailyBudget: number } | { lifetimeBudget: number }
): Promise<MetaMutationResult> {
  const params: Record<string, string> =
    'dailyBudget' in budget
      ? { daily_budget: String(Math.round(budget.dailyBudget * 100)) }
      : { lifetime_budget: String(Math.round(budget.lifetimeBudget * 100)) }

  return metaGraphPost(`/${campaignId}`, token, params)
}

/**
 * Crea el objeto campaña para un test — base de "Lanzar Testeo". Siempre en
 * PAUSED: una campaña recién creada no tiene conjuntos de anuncios ni
 * anuncios todavía, así que no puede entregar ni gastar; PAUSED es además
 * el estado en el que Meta la deja por defecto hasta que tenga contenido
 * real. `special_ad_categories` es un parámetro obligatorio de la Graph API
 * para creación de campañas — `[]` cuando no aplica ninguna categoría
 * regulada (crédito, empleo, vivienda, temas sociales).
 */
export async function createMetaCampaign(
  token: string,
  accountId: string,
  params: {
    name: string
    objective: string
    dailyBudget?: number
    status?: 'ACTIVE' | 'PAUSED'
    bidStrategy?: 'LOWEST_COST_WITHOUT_CAP' | 'LOWEST_COST_WITH_BID_CAP' | 'COST_CAP'
    bidAmount?: number
    startTime?: string
  }
): Promise<MetaCreateResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const body: Record<string, string> = {
    name: params.name,
    objective: params.objective,
    status: params.status ?? 'PAUSED',
    special_ad_categories: '[]',
  }
  if (params.dailyBudget) {
    body.daily_budget = String(Math.round(params.dailyBudget * 100))
    // Campaign Budget Optimization: la estrategia de puja vive acá solo
    // cuando el presupuesto también vive a nivel campaña.
    if (params.bidStrategy) body.bid_strategy = params.bidStrategy
    if (params.bidAmount && params.bidStrategy && params.bidStrategy !== 'LOWEST_COST_WITHOUT_CAP') {
      body.bid_amount = String(Math.round(params.bidAmount * 100))
    }
  }
  if (params.startTime) {
    body.start_time = params.startTime
  }

  return metaGraphPostRaw(`/act_${cleanAccountId}/campaigns`, token, body)
}
