import { META_GRAPH_URL } from './oauth'
import { metaGraphGet, metaGraphPostRaw, type MetaCreateResult } from './graph-client'

// ---------------------------------------------------------------------------
// Recursos de la cuenta que el wizard necesita para armar un anuncio real
// ---------------------------------------------------------------------------

export type MetaPixel = { id: string; name: string }
export type MetaPixelsResult = { ok: true; pixels: MetaPixel[] } | { ok: false; error: string }

/** Pixels reales de la cuenta — reemplaza el campo manual que pedía el legacy. */
export async function getMetaPixels(token: string, accountId: string): Promise<MetaPixelsResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const result = await metaGraphGet<{ data?: Array<{ id: string; name?: string }> }>(
    `/act_${cleanAccountId}/adspixels?fields=id,name`,
    token
  )
  if (!result.ok) return result
  return { ok: true, pixels: (result.data.data ?? []).map((p) => ({ id: p.id, name: p.name ?? `Pixel ${p.id}` })) }
}

export type MetaPage = { id: string; name: string }
export type MetaPagesResult = { ok: true; pages: MetaPage[] } | { ok: false; error: string }

/**
 * Páginas de Facebook que administra el usuario — la Graph API exige publicar
 * todo anuncio con creativo (imagen/copy) a nombre de una Página
 * (`object_story_spec.page_id`), no de la cuenta publicitaria. Requiere el
 * scope `pages_show_list` (ver lib/meta/oauth.ts) — conexiones viejas no lo
 * tienen y van a devolver una lista vacía hasta reconectar.
 */
export async function getMetaPages(token: string): Promise<MetaPagesResult> {
  const result = await metaGraphGet<{ data?: Array<{ id: string; name?: string }> }>('/me/accounts?fields=id,name', token)
  if (!result.ok) return result
  return { ok: true, pages: (result.data.data ?? []).map((p) => ({ id: p.id, name: p.name ?? `Página ${p.id}` })) }
}

export type MetaAudience = { id: string; name: string; type: 'lookalike' | 'saved' }
export type MetaAudiencesResult = { ok: true; audiences: MetaAudience[] } | { ok: false; error: string }

/**
 * Audiencias personalizadas y similares (lookalike) reales de la cuenta.
 * Mismo endpoint y mismo criterio que el legacy (`tsLoadRealAudiences`):
 * todas viven en /customaudiences, se distinguen por `subtype`.
 */
export async function getMetaAudiences(token: string, accountId: string): Promise<MetaAudiencesResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const result = await metaGraphGet<{ data?: Array<{ id: string; name?: string; subtype?: string }> }>(
    `/act_${cleanAccountId}/customaudiences?fields=id,name,subtype&limit=200`,
    token
  )
  if (!result.ok) return result
  const audiences: MetaAudience[] = (result.data.data ?? []).map((a) => ({
    id: a.id,
    name: a.name ?? `Audiencia ${a.id}`,
    type: a.subtype === 'LOOKALIKE' ? 'lookalike' : 'saved',
  }))
  return { ok: true, audiences }
}

export type MetaInterest = { id: string; name: string; audienceSizeLower: number | null; audienceSizeUpper: number | null }
export type MetaInterestsResult = { ok: true; interests: MetaInterest[] } | { ok: false; error: string }

/**
 * Búsqueda real de intereses de Meta (autocomplete) — el legacy tenía un
 * campo de texto libre para "intereses" que nunca se conectó a ninguna API
 * (quedaba sin usar en tsBuildTargeting), así que esto es una capacidad
 * nueva, no un puerto. `q` necesita 2+ caracteres o Meta devuelve vacío.
 */
export async function searchMetaInterests(token: string, query: string): Promise<MetaInterestsResult> {
  const result = await metaGraphGet<{
    data?: Array<{ id: string; name?: string; audience_size_lower_bound?: number; audience_size_upper_bound?: number }>
  }>(`/search?type=adinterest&q=${encodeURIComponent(query)}&limit=12`, token)
  if (!result.ok) return result
  const interests: MetaInterest[] = (result.data.data ?? []).map((i) => ({
    id: i.id,
    name: i.name ?? i.id,
    audienceSizeLower: i.audience_size_lower_bound ?? null,
    audienceSizeUpper: i.audience_size_upper_bound ?? null,
  }))
  return { ok: true, interests }
}

// ---------------------------------------------------------------------------
// Objetivo → configuración real del ad set
// ---------------------------------------------------------------------------

export type ObjectiveAdSetDefaults = {
  optimizationGoal: string
  billingEvent: string
  needsPixel: boolean
  conversionEvent?: string
}

// App Promotion queda afuera a propósito: pide application_id/store_url que
// este producto (ecommerce vía Tienda Nube, no una app) no tiene.
const OBJECTIVE_DEFAULTS: Record<string, ObjectiveAdSetDefaults> = {
  OUTCOME_SALES: { optimizationGoal: 'OFFSITE_CONVERSIONS', billingEvent: 'IMPRESSIONS', needsPixel: true, conversionEvent: 'PURCHASE' },
  OUTCOME_LEADS: { optimizationGoal: 'OFFSITE_CONVERSIONS', billingEvent: 'IMPRESSIONS', needsPixel: true, conversionEvent: 'LEAD' },
  OUTCOME_ENGAGEMENT: { optimizationGoal: 'POST_ENGAGEMENT', billingEvent: 'IMPRESSIONS', needsPixel: false },
  OUTCOME_TRAFFIC: { optimizationGoal: 'LINK_CLICKS', billingEvent: 'IMPRESSIONS', needsPixel: false },
  OUTCOME_AWARENESS: { optimizationGoal: 'REACH', billingEvent: 'IMPRESSIONS', needsPixel: false },
}

export function getObjectiveAdSetDefaults(objective: string): ObjectiveAdSetDefaults {
  return OBJECTIVE_DEFAULTS[objective] ?? OBJECTIVE_DEFAULTS.OUTCOME_TRAFFIC
}

// ---------------------------------------------------------------------------
// Creación real — campaña ya existe (createMetaCampaign en campaigns.ts);
// acá va el resto de la cadena: ad set → imagen → creativo → anuncio.
// ---------------------------------------------------------------------------

export type PlacementSelection =
  | 'automatic'
  | { facebook: boolean; instagram: boolean; stories: boolean; reels: boolean }

// 'broad' = Meta elige (Advantage+, sin restricciones más allá del país).
// 'existing' = un público personalizado o similar ya guardado en la cuenta.
// 'custom' = armado a mano acá — intereses y/o demografía, combinables entre sí.
export type AudienceSpec =
  | { mode: 'broad' }
  | { mode: 'existing'; audienceId: string }
  | {
      mode: 'custom'
      ageMin?: number
      ageMax?: number
      gender?: 'all' | 'male' | 'female'
      countries?: string[]
      interestIds?: string[]
    }

function buildTargeting(audience: AudienceSpec, placements: PlacementSelection): Record<string, unknown> {
  const targeting: Record<string, unknown> = {
    geo_locations: { countries: ['AR'] },
  }

  if (audience.mode === 'existing') {
    targeting.custom_audiences = [{ id: audience.audienceId }]
  } else if (audience.mode === 'custom') {
    if (audience.countries?.length) targeting.geo_locations = { countries: audience.countries }
    if (audience.ageMin) targeting.age_min = audience.ageMin
    if (audience.ageMax) targeting.age_max = audience.ageMax
    if (audience.gender === 'male') targeting.genders = [1]
    if (audience.gender === 'female') targeting.genders = [2]
    if (audience.interestIds?.length) {
      targeting.flexible_spec = [{ interests: audience.interestIds.map((id) => ({ id })) }]
    }
  }
  // 'broad': queda como público amplio (Advantage+) — comportamiento por default de Meta.

  if (placements !== 'automatic') {
    const publisherPlatforms: string[] = []
    const instagramPositions: string[] = []
    if (placements.facebook) publisherPlatforms.push('facebook')
    if (placements.instagram || placements.stories || placements.reels) publisherPlatforms.push('instagram')
    if (placements.instagram) instagramPositions.push('stream')
    if (placements.stories) instagramPositions.push('story')
    if (placements.reels) instagramPositions.push('reels')

    targeting.publisher_platforms = publisherPlatforms
    if (placements.facebook) targeting.facebook_positions = ['feed']
    if (instagramPositions.length) targeting.instagram_positions = instagramPositions
  }
  // 'automatic' = ubicaciones Advantage+: no restringimos publisher_platforms,
  // Meta elige dónde entregar.
  return targeting
}

// ---------------------------------------------------------------------------
// Advantage+ kill switch — deja desactivar, control por control, las
// automatizaciones que Meta aplica sobre el creativo/catálogo por default.
// Mismo set y mismos nombres que ADV_CONTROLS del legacy (app.html:7043).
// ---------------------------------------------------------------------------

export const ADV_CONTROLS = {
  advantage_plus_creative: { label: 'Advantage+ Creative', sub: 'Meta puede alterar tu creativo automáticamente' },
  advantage_plus_catalog: { label: 'Advantage+ Catalog', sub: 'Meta puede mezclar productos del catálogo' },
  image_enhancement: { label: 'Mejoras de imagen', sub: 'Brillo, contraste y ajustes automáticos en imágenes' },
  video_enhancement: { label: 'Mejoras de video', sub: 'Recorte, filtros y ajustes automáticos en videos' },
  text_optimization: { label: 'Optimización de texto', sub: 'Meta puede reescribir o reordenar tu copy' },
  call_to_action_enhancement: { label: 'Mejorar llamada a la acción', sub: 'CTA automático basado en comportamiento del usuario' },
  add_card: { label: 'Agregar tarjetas (carousel)', sub: 'Meta puede agregar tarjetas extra al carrusel' },
} as const

export type AdvControlKey = keyof typeof ADV_CONTROLS
export type AdvControls = Record<AdvControlKey, boolean>

export const ADV_CONTROLS_DEFAULT: AdvControls = Object.fromEntries(
  (Object.keys(ADV_CONTROLS) as AdvControlKey[]).map((key) => [key, true])
) as AdvControls

/**
 * `advantage_plus_catalog` se maneja aparte porque no es un "degree of
 * freedom" del creativo — se desactiva a nivel ad set (`catalog_based_optimization`).
 * El resto arma `degrees_of_freedom_spec.creative_features_spec`, que solo
 * hay que mandar si hay algo para desactivar (si todo sigue en ON, se omite
 * el campo entero en vez de mandar un objeto vacío).
 */
export function buildAdvantagePayload(controls: AdvControls): {
  degreesOfFreedomSpec: { creative_features_spec: Record<string, { enroll_status: 'OPT_OUT' }> } | null
  catalogOff: boolean
} {
  const creativeFeaturesSpec: Record<string, { enroll_status: 'OPT_OUT' }> = {}
  if (!controls.advantage_plus_creative) creativeFeaturesSpec.standard_enhancements = { enroll_status: 'OPT_OUT' }
  if (!controls.image_enhancement) creativeFeaturesSpec.image_enhancement = { enroll_status: 'OPT_OUT' }
  if (!controls.video_enhancement) creativeFeaturesSpec.video_enhancement = { enroll_status: 'OPT_OUT' }
  if (!controls.text_optimization) creativeFeaturesSpec.text_optimization = { enroll_status: 'OPT_OUT' }
  if (!controls.call_to_action_enhancement) creativeFeaturesSpec.call_to_action_enhancement = { enroll_status: 'OPT_OUT' }
  if (!controls.add_card) creativeFeaturesSpec.add_card = { enroll_status: 'OPT_OUT' }

  return {
    degreesOfFreedomSpec: Object.keys(creativeFeaturesSpec).length ? { creative_features_spec: creativeFeaturesSpec } : null,
    catalogOff: !controls.advantage_plus_catalog,
  }
}

export async function createTestAdSet(
  token: string,
  accountId: string,
  campaignId: string,
  params: {
    name: string
    status: 'ACTIVE' | 'PAUSED'
    objective: string
    dailyBudget?: number
    bidStrategy: 'LOWEST_COST_WITHOUT_CAP' | 'LOWEST_COST_WITH_BID_CAP' | 'COST_CAP'
    bidAmount?: number
    pixelId?: string
    audience: AudienceSpec
    placements: PlacementSelection
    catalogOff?: boolean
  }
): Promise<MetaCreateResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const defaults = getObjectiveAdSetDefaults(params.objective)

  const body: Record<string, string> = {
    name: params.name,
    campaign_id: campaignId,
    status: params.status,
    billing_event: defaults.billingEvent,
    optimization_goal: defaults.optimizationGoal,
    bid_strategy: params.bidStrategy,
    targeting: JSON.stringify(buildTargeting(params.audience, params.placements)),
  }
  if (params.dailyBudget) {
    body.daily_budget = String(Math.round(params.dailyBudget * 100))
  }
  if (params.bidAmount && params.bidStrategy !== 'LOWEST_COST_WITHOUT_CAP') {
    body.bid_amount = String(Math.round(params.bidAmount * 100))
  }
  if (defaults.needsPixel && params.pixelId) {
    body.promoted_object = JSON.stringify({ pixel_id: params.pixelId, custom_event_type: defaults.conversionEvent })
  }
  if (params.catalogOff) {
    body.catalog_based_optimization = 'NONE'
  }

  return metaGraphPostRaw(`/act_${cleanAccountId}/adsets`, token, body)
}

export type MetaImageUploadResult = { ok: true; hash: string } | { ok: false; error: string }

/**
 * Sube una imagen para usar como creativo. `base64Data` va sin el prefijo
 * `data:image/...;base64,` — solo el contenido. Meta la devuelve indexada
 * por nombre de archivo interno; tomamos la primera (subimos una a la vez).
 */
export async function uploadMetaAdImage(token: string, accountId: string, base64Data: string): Promise<MetaImageUploadResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  try {
    const res = await fetch(`${META_GRAPH_URL}/act_${cleanAccountId}/adimages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ bytes: base64Data, access_token: token }),
    })
    const data = (await res.json()) as { error?: { message?: string }; images?: Record<string, { hash?: string }> }
    if (data.error) {
      return { ok: false, error: data.error.message ?? 'Meta rechazó la imagen.' }
    }
    const first = data.images ? Object.values(data.images)[0] : undefined
    if (!first?.hash) {
      return { ok: false, error: 'Meta no devolvió un hash de imagen válido.' }
    }
    return { ok: true, hash: first.hash }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red subiendo la imagen.' }
  }
}

export async function createTestAdCreative(
  token: string,
  accountId: string,
  params: {
    name: string
    pageId: string
    imageHash: string
    link: string
    headline: string
    body: string
    // Opcional — la Biblioteca de Ads (2026-07-25) es la primera fuente que
    // sí conoce un CTA por creativo; el flujo de subida manual del wizard
    // sigue sin mandarlo, mismo comportamiento de siempre (Meta lo omite).
    cta?: string
    degreesOfFreedomSpec?: ReturnType<typeof buildAdvantagePayload>['degreesOfFreedomSpec']
  }
): Promise<MetaCreateResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const objectStorySpec = {
    page_id: params.pageId,
    link_data: {
      image_hash: params.imageHash,
      link: params.link,
      message: params.body,
      name: params.headline,
      ...(params.cta ? { call_to_action: { type: params.cta } } : {}),
    },
  }
  const creativeBody: Record<string, string> = {
    name: params.name,
    object_story_spec: JSON.stringify(objectStorySpec),
  }
  if (params.degreesOfFreedomSpec) {
    creativeBody.degrees_of_freedom_spec = JSON.stringify(params.degreesOfFreedomSpec)
  }
  return metaGraphPostRaw(`/act_${cleanAccountId}/adcreatives`, token, creativeBody)
}

// ---------------------------------------------------------------------------
// Video — subida simple (una request, sin protocolo resumable de tramos) +
// espera de procesamiento + miniatura. Archivos muy pesados pueden superar
// el tiempo de una función serverless en producción (Vercel corta a los
// 60s en planes pagos, 10s en el gratuito) — para testeos cortos alcanza,
// para videos largos esto necesitaría subida por tramos, que queda afuera.
// ---------------------------------------------------------------------------

export type MetaVideoUploadResult = { ok: true; videoId: string } | { ok: false; error: string }

export async function uploadMetaAdVideo(token: string, accountId: string, buffer: Buffer, filename: string): Promise<MetaVideoUploadResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  try {
    const form = new FormData()
    form.append('access_token', token)
    form.append('source', new Blob([new Uint8Array(buffer)]), filename)

    const res = await fetch(`${META_GRAPH_URL}/act_${cleanAccountId}/advideos`, { method: 'POST', body: form })
    const data = (await res.json()) as { error?: { message?: string }; id?: string }
    if (data.error) {
      return { ok: false, error: data.error.message ?? 'Meta rechazó el video.' }
    }
    if (!data.id) {
      return { ok: false, error: 'Meta no devolvió un ID de video válido.' }
    }
    return { ok: true, videoId: data.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red subiendo el video.' }
  }
}

export type MetaVideoReadyResult = { ok: true; thumbnailUrl: string | null } | { ok: false; error: string }

/**
 * Espera a que Meta termine de procesar el video (thumbnails, transcodeo)
 * antes de armar el creativo — crearlo antes de que esté "ready" falla del
 * lado de Meta. Sondea cada 3s hasta `timeoutMs`.
 */
export async function waitForMetaVideoReady(token: string, videoId: string, timeoutMs = 45000): Promise<MetaVideoReadyResult> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const statusResult = await metaGraphGet<{ status?: { video_status?: string } }>(`/${videoId}?fields=status`, token)
    if (!statusResult.ok) return statusResult

    const videoStatus = statusResult.data.status?.video_status
    if (videoStatus === 'ready') {
      const thumbsResult = await metaGraphGet<{ data?: Array<{ uri?: string; is_preferred?: boolean }> }>(
        `/${videoId}/thumbnails`,
        token
      )
      const thumbs = thumbsResult.ok ? (thumbsResult.data.data ?? []) : []
      const preferred = thumbs.find((t) => t.is_preferred) ?? thumbs[0]
      return { ok: true, thumbnailUrl: preferred?.uri ?? null }
    }
    if (videoStatus === 'error') {
      return { ok: false, error: 'Meta no pudo procesar el video — probá con otro archivo.' }
    }

    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  return { ok: false, error: 'El video tardó demasiado en procesarse. Probá con un archivo más liviano o más corto.' }
}

export async function createTestAdCreativeVideo(
  token: string,
  accountId: string,
  params: {
    name: string
    pageId: string
    videoId: string
    thumbnailUrl: string | null
    link: string
    headline: string
    body: string
    cta?: string
    degreesOfFreedomSpec?: ReturnType<typeof buildAdvantagePayload>['degreesOfFreedomSpec']
  }
): Promise<MetaCreateResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const videoData: Record<string, unknown> = {
    video_id: params.videoId,
    title: params.headline,
    message: params.body,
    link_description: params.body,
    call_to_action: { type: params.cta ?? 'LEARN_MORE', value: { link: params.link } },
  }
  if (params.thumbnailUrl) {
    videoData.image_url = params.thumbnailUrl
  }
  const objectStorySpec = { page_id: params.pageId, video_data: videoData }
  const creativeBody: Record<string, string> = {
    name: params.name,
    object_story_spec: JSON.stringify(objectStorySpec),
  }
  if (params.degreesOfFreedomSpec) {
    creativeBody.degrees_of_freedom_spec = JSON.stringify(params.degreesOfFreedomSpec)
  }
  return metaGraphPostRaw(`/act_${cleanAccountId}/adcreatives`, token, creativeBody)
}

// ---------------------------------------------------------------------------
// Reusar publicación existente — en vez de crear un post nuevo, el anuncio
// nuevo hereda los likes/comentarios/shares de un anuncio ya activo.
// ---------------------------------------------------------------------------

export type MetaExistingPost = { id: string; name: string; objectStoryId: string }
export type MetaExistingPostsResult = { ok: true; posts: MetaExistingPost[] } | { ok: false; error: string }

export async function getMetaExistingPosts(token: string, accountId: string): Promise<MetaExistingPostsResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const result = await metaGraphGet<{ data?: Array<{ id: string; name?: string; effective_object_story_id?: string }> }>(
    `/act_${cleanAccountId}/ads?fields=id,name,effective_object_story_id&effective_status=["ACTIVE","PAUSED"]&limit=100`,
    token
  )
  if (!result.ok) return result

  const posts = (result.data.data ?? [])
    .filter((a): a is { id: string; name?: string; effective_object_story_id: string } => Boolean(a.effective_object_story_id))
    .map((a) => ({ id: a.id, name: a.name ?? 'Sin nombre', objectStoryId: a.effective_object_story_id }))

  return { ok: true, posts }
}

export async function createTestAdCreativeFromExisting(
  token: string,
  accountId: string,
  params: { name: string; objectStoryId: string }
): Promise<MetaCreateResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  return metaGraphPostRaw(`/act_${cleanAccountId}/adcreatives`, token, {
    name: params.name,
    object_story_id: params.objectStoryId,
  })
}

export async function createTestAd(
  token: string,
  accountId: string,
  params: { name: string; adsetId: string; creativeId: string; status: 'ACTIVE' | 'PAUSED' }
): Promise<MetaCreateResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  return metaGraphPostRaw(`/act_${cleanAccountId}/ads`, token, {
    name: params.name,
    adset_id: params.adsetId,
    creative: JSON.stringify({ creative_id: params.creativeId }),
    status: params.status,
  })
}
