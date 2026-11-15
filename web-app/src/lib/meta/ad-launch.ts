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

/**
 * El usuario de Meta administra páginas de varios clientes (y personales):
 * la primera de la lista casi nunca es la correcta. Se pone primero la
 * Página vinculada al Instagram del cliente y, si no hay, la que coincide
 * con el nombre de la organización — así el valor por defecto del selector
 * es la marca del cliente activo.
 */
export function orderPagesForOrganization(pages: MetaPage[], preferredPageId: string | null | undefined, organizationName: string | null | undefined): MetaPage[] {
  const normalize = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const orgWords = organizationName ? normalize(organizationName).split(/\s+/).filter((w) => w.length > 3) : []
  const score = (p: MetaPage) => {
    if (preferredPageId && p.id === preferredPageId) return 2
    const name = normalize(p.name)
    return orgWords.length > 0 && orgWords.every((w) => name.includes(w)) ? 1 : 0
  }
  return [...pages].sort((a, b) => score(b) - score(a))
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
  // Control total (2026-11-15): lo que Meta prende sola en los anuncios nuevos.
  site_products: { label: 'Productos y links de tu web', sub: 'Meta agrega productos o páginas de tu sitio debajo del anuncio' },
  multi_advertiser: { label: 'Anuncios de otras marcas', sub: 'Meta muestra tu anuncio en una tira junto a anuncios de otras marcas' },
  music_and_effects: { label: 'Música, animaciones y plantillas', sub: 'Meta agrega música, anima imágenes o le pone marcos y fondos' },
  translation_and_extras: { label: 'Traducción, comentarios y perfil', sub: 'Meta traduce el texto, destaca comentarios o agrega tu perfil' },
  auto_crop: { label: 'Recortes y adaptación por ubicación', sub: 'Meta recorta o reacomoda el creativo según dónde se muestra' },
} as const

export type AdvControlKey = keyof typeof ADV_CONTROLS
export type AdvControls = Record<AdvControlKey, boolean>

/** Por default todo apagado ("Control total"): el anuncio sale tal cual lo subiste. */
export const ADV_CONTROLS_DEFAULT: AdvControls = Object.fromEntries(
  (Object.keys(ADV_CONTROLS) as AdvControlKey[]).map((key) => [key, false])
) as AdvControls

type FeatureSpec = Record<string, { enroll_status: 'OPT_OUT' }>

/**
 * `advantage_plus_catalog` se maneja aparte porque no es un "degree of
 * freedom" del creativo — se desactiva a nivel ad set (`catalog_based_optimization`).
 * "Anuncios de otras marcas" tampoco: es `contextual_multi_ads` del creativo.
 * El resto arma `degrees_of_freedom_spec.creative_features_spec`.
 *
 * `degreesOfFreedomSpec` lleva el set completo de funciones que Meta prende
 * sola (nombres de la Marketing API, 2026). `coreSpec` es el set original
 * de 6 que ya se usaba y Meta acepta siempre: si Meta rechaza alguna función
 * nueva para un tipo de creativo, se reintenta con este (ver createCreativeWithFallback).
 */
export function buildAdvantagePayload(controls: AdvControls): {
  degreesOfFreedomSpec: { creative_features_spec: FeatureSpec } | null
  coreSpec: { creative_features_spec: FeatureSpec } | null
  catalogOff: boolean
  multiAdsOff: boolean
} {
  const core: FeatureSpec = {}
  const off = (spec: FeatureSpec, keys: string[]) => keys.forEach((k) => (spec[k] = { enroll_status: 'OPT_OUT' }))
  if (!controls.advantage_plus_creative) off(core, ['standard_enhancements'])
  if (!controls.image_enhancement) off(core, ['image_enhancement'])
  if (!controls.video_enhancement) off(core, ['video_enhancement'])
  if (!controls.text_optimization) off(core, ['text_optimization'])
  if (!controls.call_to_action_enhancement) off(core, ['call_to_action_enhancement'])
  if (!controls.add_card) off(core, ['add_card'])

  const full: FeatureSpec = { ...core }
  if (!controls.advantage_plus_creative) off(full, ['advantage_plus_creative'])
  if (!controls.image_enhancement) off(full, ['image_touchups', 'image_brightness_and_contrast', 'image_uncrop', 'image_background_gen'])
  if (!controls.video_enhancement) off(full, ['video_filtering', 'video_highlight'])
  if (!controls.text_optimization) off(full, ['text_optimizations', 'description_automation', 'add_text_overlay'])
  if (!controls.call_to_action_enhancement) off(full, ['enhance_cta'])
  if (!controls.site_products) off(full, ['product_extensions', 'site_extensions'])
  if (!controls.music_and_effects) off(full, ['audio', 'image_animation', 'image_templates', 'carousel_to_video', 'reveal_details_over_time'])
  if (!controls.translation_and_extras) off(full, ['text_translation', 'inline_comment', 'profile_card'])
  if (!controls.auto_crop) off(full, ['adapt_to_placement', 'image_auto_crop', 'video_auto_crop', 'media_type_automation'])

  return {
    degreesOfFreedomSpec: Object.keys(full).length ? { creative_features_spec: full } : null,
    coreSpec: Object.keys(core).length ? { creative_features_spec: core } : null,
    catalogOff: !controls.advantage_plus_catalog,
    multiAdsOff: !controls.multi_advertiser,
  }
}

type AdvPayload = ReturnType<typeof buildAdvantagePayload>

/**
 * Control posterior: lee el creativo ya creado y devuelve las funciones que
 * pedimos apagar y Meta igual dejó prendidas (vacío = todo en orden). Si la
 * lectura falla no se reporta nada: no vale la pena frenar el lanzamiento.
 */
export async function findMetaFeaturesStillOn(token: string, creativeId: string, adv: AdvPayload): Promise<string[]> {
  const requested = adv.degreesOfFreedomSpec?.creative_features_spec ?? {}
  if (!creativeId || (Object.keys(requested).length === 0 && !adv.multiAdsOff)) return []
  const res = await metaGraphGet<{
    degrees_of_freedom_spec?: { creative_features_spec?: Record<string, { enroll_status?: string }> }
    contextual_multi_ads?: { enroll_status?: string }
  }>(`/${creativeId}?fields=degrees_of_freedom_spec,contextual_multi_ads`, token)
  if (!res.ok) return []
  const actual = res.data.degrees_of_freedom_spec?.creative_features_spec ?? {}
  const stillOn = Object.keys(requested).filter((k) => actual[k]?.enroll_status === 'OPT_IN')
  if (adv.multiAdsOff && res.data.contextual_multi_ads?.enroll_status === 'OPT_IN') stillOn.push('contextual_multi_ads')
  return stillOn
}

// Si Meta rechaza alguna función del set completo (no todas existen para
// todos los formatos), se recuerda en este proceso y se usa el set original.
let fullSpecRejected = false

/** Crea el creativo con el set completo de "Control total"; si Meta rechaza alguna función, reintenta con el set original. */
async function createCreativeWithFallback(accountId: string, token: string, base: Record<string, string>, adv?: AdvPayload): Promise<MetaCreateResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const path = `/act_${cleanAccountId}/adcreatives`
  if (!adv) return metaGraphPostRaw(path, token, base)

  const withSpec = (spec: AdvPayload['degreesOfFreedomSpec'], multi: boolean) => {
    const body = { ...base }
    if (spec) body.degrees_of_freedom_spec = JSON.stringify(spec)
    if (multi && adv.multiAdsOff) body.contextual_multi_ads = JSON.stringify({ enroll_status: 'OPT_OUT' })
    return body
  }

  if (!fullSpecRejected) {
    const first = await metaGraphPostRaw(path, token, withSpec(adv.degreesOfFreedomSpec, true))
    if (first.ok) return first
    console.error('[meta] creativo con Control total rechazado, reintento con el set original:', first.error)
    if (/creative_features|degrees_of_freedom|contextual_multi|enroll|feature|par[aá]metro|parameter/i.test(first.error)) fullSpecRejected = true
  }
  return metaGraphPostRaw(path, token, withSpec(adv.coreSpec, false))
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
    adv?: AdvPayload
  }
): Promise<MetaCreateResult> {
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
  return createCreativeWithFallback(accountId, token, { name: params.name, object_story_spec: JSON.stringify(objectStorySpec) }, params.adv)
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

/**
 * Subida por link (2026-11-15): el navegador sube el archivo directo al
 * almacenamiento de Gotix y Meta lo descarga de ahí (`file_url`). El archivo
 * no pasa por la función del servidor, así que no aplica el límite de 4,5 MB
 * de Vercel y no hay que esperar el procesamiento de Meta en la misma request.
 */
export async function uploadMetaAdVideoFromUrl(token: string, accountId: string, fileUrl: string, name: string): Promise<MetaVideoUploadResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const result = await metaGraphPostRaw(`/act_${cleanAccountId}/advideos`, token, { file_url: fileUrl, name })
  if (!result.ok) return result
  if (!result.id) return { ok: false, error: 'Meta no devolvió un ID de video válido.' }
  return { ok: true, videoId: result.id }
}

export type MetaVideoStatus = { ok: true; status: 'processing' | 'ready' | 'error'; thumbnailUrl: string | null } | { ok: false; error: string }

/** Una sola consulta del estado del video (el navegador la repite cada pocos segundos). */
export async function getMetaVideoStatus(token: string, videoId: string): Promise<MetaVideoStatus> {
  const statusResult = await metaGraphGet<{ status?: { video_status?: string } }>(`/${videoId}?fields=status`, token)
  if (!statusResult.ok) return statusResult
  const videoStatus = statusResult.data.status?.video_status
  if (videoStatus === 'error') return { ok: true, status: 'error', thumbnailUrl: null }
  if (videoStatus !== 'ready') return { ok: true, status: 'processing', thumbnailUrl: null }
  const thumbsResult = await metaGraphGet<{ data?: Array<{ uri?: string; is_preferred?: boolean }> }>(`/${videoId}/thumbnails`, token)
  const thumbs = thumbsResult.ok ? (thumbsResult.data.data ?? []) : []
  // Meta a veces marca "ready" antes de generar las miniaturas: se sigue esperando.
  if (thumbs.length === 0) return { ok: true, status: 'processing', thumbnailUrl: null }
  const preferred = thumbs.find((t) => t.is_preferred) ?? thumbs[0]
  return { ok: true, status: 'ready', thumbnailUrl: preferred?.uri ?? null }
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
    adv?: AdvPayload
  }
): Promise<MetaCreateResult> {
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
  return createCreativeWithFallback(accountId, token, { name: params.name, object_story_spec: JSON.stringify(objectStorySpec) }, params.adv)
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

// ---------------------------------------------------------------------------
// "Publicitar un posteo orgánico" (2026-08-06) — a diferencia de
// createTestAdCreativeFromExisting (arriba, reusa un ANUNCIO que ya existe
// vía effective_object_story_id), esto arranca de una publicación orgánica
// real de Instagram que NUNCA se publicitó — el dato sale de
// instagram_media_catalog (ya sincronizado, cero llamados nuevos a la
// Graph API para listar el feed). El campo real de la Marketing API para
// este caso es `source_instagram_media_id` + `instagram_actor_id` dentro
// de object_story_spec — NO `object_story_id` (ese es para posts de
// Facebook Page) ni `link_data`/`video_data` (esos arman una pieza nueva
// desde cero). El anuncio resultante muestra la publicación tal cual está
// en Instagram — por eso no acepta headline/body/link propios, a
// diferencia de los otros modos de creativo.
// ---------------------------------------------------------------------------

export async function createTestAdCreativeFromInstagramPost(
  token: string,
  accountId: string,
  params: { name: string; igActorId: string; igMediaId: string }
): Promise<MetaCreateResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')
  const objectStorySpec = {
    instagram_actor_id: params.igActorId,
    source_instagram_media_id: params.igMediaId,
  }
  return metaGraphPostRaw(`/act_${cleanAccountId}/adcreatives`, token, {
    name: params.name,
    object_story_spec: JSON.stringify(objectStorySpec),
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
