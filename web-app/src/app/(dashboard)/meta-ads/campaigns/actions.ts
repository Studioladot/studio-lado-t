'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import {
  updateMetaCampaignStatus,
  updateMetaCampaignBudget,
  createMetaCampaign,
  updateMetaAdSetStatus,
  updateMetaAdStatus,
} from '@/lib/meta/campaigns'
import {
  createTestAdSet,
  uploadMetaAdImage,
  uploadMetaAdVideo,
  waitForMetaVideoReady,
  createTestAdCreative,
  createTestAd,
  getObjectiveAdSetDefaults,
  createTestAdCreativeVideo,
  createTestAdCreativeFromExisting,
  buildAdvantagePayload,
  ADV_CONTROLS,
  ADV_CONTROLS_DEFAULT,
  type AdvControlKey,
  type AdvControls,
  type AudienceSpec,
} from '@/lib/meta/ad-launch'
import { getLibraryCreativeById, markLibraryCreativeDeployed } from '@/lib/meta/library'
import { insertLaunchActivityLog } from '@/lib/meta/history'

async function getMetaToken(activeOrganizationId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('meta_connections')
    .select('token')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()
  return data?.token ?? null
}

async function getMetaConnectionInfo(activeOrganizationId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('meta_connections')
    .select('token, account_id')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()
  return data ?? null
}

function withError(returnTo: string, message: string) {
  const separator = returnTo.includes('?') ? '&' : '?'
  return `${returnTo}${separator}campaign_error=${encodeURIComponent(message)}`
}

export async function toggleCampaignStatusAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '')
  const nextStatus = String(formData.get('next_status') ?? '')
  const returnTo = String(formData.get('return_to') ?? '/meta-ads/campaigns')

  if (nextStatus !== 'ACTIVE' && nextStatus !== 'PAUSED') {
    redirect(withError(returnTo, 'Estado inválido.'))
  }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId || !campaignId) {
    redirect(withError(returnTo, 'No encontramos tu organización activa.'))
  }

  const token = await getMetaToken(activeOrganizationId)
  if (!token) {
    redirect(withError(returnTo, 'Meta Ads no está conectado.'))
  }

  const result = await updateMetaCampaignStatus(token, campaignId, nextStatus)

  revalidatePath('/meta-ads/campaigns')
  revalidatePath(`/meta-ads/campaigns/${campaignId}`)

  if (!result.ok) {
    redirect(withError(returnTo, result.error))
  }

  redirect(returnTo)
}

export async function bulkToggleCampaignStatusAction(formData: FormData) {
  const campaignIds = String(formData.get('campaign_ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  const nextStatus = String(formData.get('next_status') ?? '')
  const returnTo = String(formData.get('return_to') ?? '/meta-ads/campaigns')

  if (nextStatus !== 'ACTIVE' && nextStatus !== 'PAUSED') {
    redirect(withError(returnTo, 'Estado inválido.'))
  }
  if (campaignIds.length === 0) {
    redirect(withError(returnTo, 'No hay campañas seleccionadas.'))
  }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) {
    redirect(withError(returnTo, 'No encontramos tu organización activa.'))
  }

  const token = await getMetaToken(activeOrganizationId)
  if (!token) {
    redirect(withError(returnTo, 'Meta Ads no está conectado.'))
  }

  const results = await Promise.all(campaignIds.map((id) => updateMetaCampaignStatus(token, id, nextStatus)))

  revalidatePath('/meta-ads/campaigns')

  const failed = results.filter((r) => !r.ok).length
  if (failed > 0) {
    redirect(withError(returnTo, `${failed} de ${campaignIds.length} campañas no se pudieron actualizar.`))
  }

  redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}campaign_success=1`)
}

// Mismo patrón exacto que toggleCampaignStatusAction/bulkToggleCampaignStatusAction
// arriba, aplicado a Conjuntos y Anuncios — para que "pausar/reactivar" sea la
// misma función en los 3 niveles, no solo a nivel Campaña.

export async function toggleAdSetStatusAction(formData: FormData) {
  const adSetId = String(formData.get('adset_id') ?? '')
  const nextStatus = String(formData.get('next_status') ?? '')
  const returnTo = String(formData.get('return_to') ?? '/meta-ads/campaigns')

  if (nextStatus !== 'ACTIVE' && nextStatus !== 'PAUSED') {
    redirect(withError(returnTo, 'Estado inválido.'))
  }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId || !adSetId) {
    redirect(withError(returnTo, 'No encontramos tu organización activa.'))
  }

  const token = await getMetaToken(activeOrganizationId)
  if (!token) {
    redirect(withError(returnTo, 'Meta Ads no está conectado.'))
  }

  const result = await updateMetaAdSetStatus(token, adSetId, nextStatus)

  revalidatePath(returnTo)

  if (!result.ok) {
    redirect(withError(returnTo, result.error))
  }

  redirect(returnTo)
}

export async function bulkToggleAdSetStatusAction(formData: FormData) {
  const adSetIds = String(formData.get('adset_ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  const nextStatus = String(formData.get('next_status') ?? '')
  const returnTo = String(formData.get('return_to') ?? '/meta-ads/campaigns')

  if (nextStatus !== 'ACTIVE' && nextStatus !== 'PAUSED') {
    redirect(withError(returnTo, 'Estado inválido.'))
  }
  if (adSetIds.length === 0) {
    redirect(withError(returnTo, 'No hay conjuntos seleccionados.'))
  }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) {
    redirect(withError(returnTo, 'No encontramos tu organización activa.'))
  }

  const token = await getMetaToken(activeOrganizationId)
  if (!token) {
    redirect(withError(returnTo, 'Meta Ads no está conectado.'))
  }

  const results = await Promise.all(adSetIds.map((id) => updateMetaAdSetStatus(token, id, nextStatus)))

  revalidatePath(returnTo)

  const failed = results.filter((r) => !r.ok).length
  if (failed > 0) {
    redirect(withError(returnTo, `${failed} de ${adSetIds.length} conjuntos no se pudieron actualizar.`))
  }

  redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}campaign_success=1`)
}

export async function toggleAdStatusAction(formData: FormData) {
  const adId = String(formData.get('ad_id') ?? '')
  const nextStatus = String(formData.get('next_status') ?? '')
  const returnTo = String(formData.get('return_to') ?? '/meta-ads/campaigns')

  if (nextStatus !== 'ACTIVE' && nextStatus !== 'PAUSED') {
    redirect(withError(returnTo, 'Estado inválido.'))
  }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId || !adId) {
    redirect(withError(returnTo, 'No encontramos tu organización activa.'))
  }

  const token = await getMetaToken(activeOrganizationId)
  if (!token) {
    redirect(withError(returnTo, 'Meta Ads no está conectado.'))
  }

  const result = await updateMetaAdStatus(token, adId, nextStatus)

  revalidatePath(returnTo)

  if (!result.ok) {
    redirect(withError(returnTo, result.error))
  }

  redirect(returnTo)
}

export async function bulkToggleAdStatusAction(formData: FormData) {
  const adIds = String(formData.get('ad_ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  const nextStatus = String(formData.get('next_status') ?? '')
  const returnTo = String(formData.get('return_to') ?? '/meta-ads/campaigns')

  if (nextStatus !== 'ACTIVE' && nextStatus !== 'PAUSED') {
    redirect(withError(returnTo, 'Estado inválido.'))
  }
  if (adIds.length === 0) {
    redirect(withError(returnTo, 'No hay anuncios seleccionados.'))
  }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) {
    redirect(withError(returnTo, 'No encontramos tu organización activa.'))
  }

  const token = await getMetaToken(activeOrganizationId)
  if (!token) {
    redirect(withError(returnTo, 'Meta Ads no está conectado.'))
  }

  const results = await Promise.all(adIds.map((id) => updateMetaAdStatus(token, id, nextStatus)))

  revalidatePath(returnTo)

  const failed = results.filter((r) => !r.ok).length
  if (failed > 0) {
    redirect(withError(returnTo, `${failed} de ${adIds.length} anuncios no se pudieron actualizar.`))
  }

  redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}campaign_success=1`)
}

export type LaunchStep = { label: string; ok: boolean; detail?: string }
export type LaunchTestCampaignState = {
  error: string | null
  steps: LaunchStep[]
  campaignId: string | null
}

const BID_STRATEGIES = new Set(['LOWEST_COST_WITHOUT_CAP', 'LOWEST_COST_WITH_BID_CAP', 'COST_CAP'])

function numberField(formData: FormData, key: string): number | undefined {
  const raw = String(formData.get(key) ?? '').trim()
  if (!raw) return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

function intField(formData: FormData, key: string, fallback: number): number {
  const raw = String(formData.get(key) ?? '').trim()
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

/** Lee los toggles de Advantage+ del form — si falta alguno, asume ON (mismo default que el wizard). */
function parseAdvControls(formData: FormData): AdvControls {
  const controls = { ...ADV_CONTROLS_DEFAULT }
  for (const key of Object.keys(ADV_CONTROLS) as AdvControlKey[]) {
    const raw = formData.get(`adv_${key}`)
    if (raw !== null) controls[key] = raw === '1'
  }
  return controls
}

type AdInput = {
  name: string
  mode: 'new' | 'existing' | 'library'
  link: string
  headline: string
  body: string
  mediaType: 'image' | 'video'
  image: File | null
  videoId?: string
  videoThumbnailUrl?: string
  existingPostObjectStoryId?: string
  libraryAssetId?: string
}
type AdSetInput = { name: string; audience: AudienceSpec; duplicateCount: number; ads: AdInput[] }

/** Lee el bloque de público armado por AudienceSelector para el conjunto `i`. */
function parseAudience(formData: FormData, i: number): AudienceSpec {
  const mode = String(formData.get(`adset_audience_mode_${i}`) ?? 'broad')

  if (mode === 'existing') {
    const audienceId = String(formData.get(`adset_audience_${i}`) ?? '').trim()
    return audienceId ? { mode: 'existing', audienceId } : { mode: 'broad' }
  }

  if (mode === 'custom') {
    const genderRaw = String(formData.get(`adset_gender_${i}`) ?? 'all')
    const gender: 'all' | 'male' | 'female' = genderRaw === 'male' || genderRaw === 'female' ? genderRaw : 'all'
    const country = String(formData.get(`adset_country_${i}`) ?? '').trim()

    let interestIds: string[] = []
    const rawInterests = String(formData.get(`adset_interests_${i}`) ?? '')
    if (rawInterests) {
      try {
        const parsed = JSON.parse(rawInterests)
        if (Array.isArray(parsed)) interestIds = parsed.filter((id): id is string => typeof id === 'string')
      } catch {
        interestIds = []
      }
    }

    return {
      mode: 'custom',
      ageMin: numberField(formData, `adset_age_min_${i}`),
      ageMax: numberField(formData, `adset_age_max_${i}`),
      gender,
      countries: country ? [country] : undefined,
      interestIds: interestIds.length ? interestIds : undefined,
    }
  }

  return { mode: 'broad' }
}

/**
 * Lee la estructura de conjuntos/anuncios dinámica armada por AdSetEditor/AdEditor.
 * El video ya se subió a Meta antes de este submit (ver ad-editor.tsx +
 * /api/meta/upload-video) — acá solo llega su ID, no el archivo.
 */
function parseAdSets(formData: FormData, campaignName: string, productUrl: string): AdSetInput[] {
  const adSetCount = intField(formData, 'adset_count', 1)
  const adSets: AdSetInput[] = []

  for (let i = 0; i < adSetCount; i++) {
    const adCount = intField(formData, `ad_count_${i}`, 1)
    const ads: AdInput[] = []
    for (let j = 0; j < adCount; j++) {
      const modeRaw = String(formData.get(`ad_mode_${i}_${j}`) ?? 'new')
      const mode = modeRaw === 'existing' || modeRaw === 'library' ? modeRaw : 'new'
      const mediaType = String(formData.get(`ad_media_type_${i}_${j}`) ?? 'image') === 'video' ? 'video' : 'image'
      ads.push({
        name: String(formData.get(`ad_name_${i}_${j}`) ?? '').trim(),
        mode,
        link: String(formData.get(`ad_link_${i}_${j}`) ?? '').trim() || productUrl,
        headline: String(formData.get(`ad_headline_${i}_${j}`) ?? '').trim(),
        body: String(formData.get(`ad_body_${i}_${j}`) ?? '').trim(),
        mediaType,
        image: formData.get(`ad_image_${i}_${j}`) as File | null,
        videoId: String(formData.get(`ad_video_id_${i}_${j}`) ?? '').trim() || undefined,
        videoThumbnailUrl: String(formData.get(`ad_video_thumbnail_${i}_${j}`) ?? '').trim() || undefined,
        existingPostObjectStoryId: String(formData.get(`ad_existing_post_${i}_${j}`) ?? '').trim() || undefined,
        libraryAssetId: String(formData.get(`ad_library_id_${i}_${j}`) ?? '').trim() || undefined,
      })
    }
    adSets.push({
      name: String(formData.get(`adset_name_${i}`) ?? '').trim() || `${campaignName} — Conjunto ${i + 1}`,
      audience: parseAudience(formData, i),
      // Tope de 10 — evita que un typo en el input mande cientos de llamados a la API.
      duplicateCount: Math.min(10, intField(formData, `adset_duplicates_${i}`, 1)),
      ads,
    })
  }

  return adSets
}

export async function launchTestCampaignAction(
  _prevState: LaunchTestCampaignState,
  formData: FormData
): Promise<LaunchTestCampaignState> {
  const name = String(formData.get('name') ?? '').trim()
  const objective = String(formData.get('objective') ?? '')
  const productUrl = String(formData.get('product_url') ?? '').trim()
  const campaignMode = String(formData.get('campaign_mode') ?? 'new') === 'existing' ? 'existing' : 'new'
  const existingCampaignId = String(formData.get('existing_campaign_id') ?? '').trim()

  const scheduleDatetime = String(formData.get('schedule_datetime') ?? '').trim()
  const publishActive = formData.get('publish_active') === '1'

  const budgetMode = String(formData.get('budget_mode') ?? 'abo')
  const dailyBudget = numberField(formData, 'daily_budget')
  const bidStrategyRaw = String(formData.get('bid_strategy') ?? 'LOWEST_COST_WITHOUT_CAP')
  const bidStrategy = (
    BID_STRATEGIES.has(bidStrategyRaw) ? bidStrategyRaw : 'LOWEST_COST_WITHOUT_CAP'
  ) as 'LOWEST_COST_WITHOUT_CAP' | 'LOWEST_COST_WITH_BID_CAP' | 'COST_CAP'
  const bidAmount = numberField(formData, 'bid_amount')

  const placementsMode = String(formData.get('placements_mode') ?? 'automatic')
  const placements =
    placementsMode === 'manual'
      ? {
          facebook: formData.get('placement_facebook') === '1',
          instagram: formData.get('placement_instagram') === '1',
          stories: formData.get('placement_stories') === '1',
          reels: formData.get('placement_reels') === '1',
        }
      : ('automatic' as const)

  const pixelId = String(formData.get('pixel_id') ?? '').trim() || undefined
  const pageId = String(formData.get('page_id') ?? '').trim()

  const advPayload = buildAdvantagePayload(parseAdvControls(formData))

  const adSetInputs = parseAdSets(formData, name, productUrl)

  const empty: LaunchStep[] = []

  if (!name) return { error: 'Ponele un nombre a la campaña.', steps: empty, campaignId: null }
  if (!objective) return { error: 'Elegí un objetivo.', steps: empty, campaignId: null }
  if (campaignMode === 'existing' && !existingCampaignId) {
    return { error: 'Elegí qué campaña existente vas a usar.', steps: empty, campaignId: null }
  }
  if (dailyBudget === undefined || dailyBudget <= 0) {
    return { error: 'El presupuesto diario tiene que ser un número mayor a 0.', steps: empty, campaignId: null }
  }
  if (!pageId) return { error: 'Elegí con qué Página de Facebook vas a publicar los anuncios.', steps: empty, campaignId: null }
  if (adSetInputs.length === 0 || adSetInputs.every((a) => a.ads.length === 0)) {
    return { error: 'Armá al menos un conjunto con un anuncio.', steps: empty, campaignId: null }
  }
  for (const adSet of adSetInputs) {
    for (const ad of adSet.ads) {
      if (ad.mode === 'existing') {
        if (!ad.existingPostObjectStoryId) {
          return { error: `Elegí qué publicación reusar en "${adSet.name}".`, steps: empty, campaignId: null }
        }
        continue
      }
      if (ad.mode === 'library') {
        if (!ad.libraryAssetId) {
          return { error: `Elegí qué creativo de la Biblioteca usar en "${adSet.name}".`, steps: empty, campaignId: null }
        }
        continue
      }
      if (!ad.body) return { error: `Falta el copy de un anuncio en "${adSet.name}".`, steps: empty, campaignId: null }
      if (!ad.link) return { error: `Falta el link de destino de un anuncio en "${adSet.name}".`, steps: empty, campaignId: null }
      if (ad.mediaType === 'image' && (!ad.image || ad.image.size === 0)) {
        return { error: `Falta la imagen de un anuncio en "${adSet.name}".`, steps: empty, campaignId: null }
      }
      if (ad.mediaType === 'video' && !ad.videoId) {
        return {
          error: `Falta terminar de subir el video de un anuncio en "${adSet.name}" — esperá a que quede en verde antes de generar el testeo.`,
          steps: empty,
          campaignId: null,
        }
      }
    }
  }

  const defaults = getObjectiveAdSetDefaults(objective)
  if (defaults.needsPixel && !pixelId) {
    return { error: 'Este objetivo necesita un pixel — elegí uno.', steps: empty, campaignId: null }
  }

  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { error: 'No encontramos tu organización activa.', steps: empty, campaignId: null }

  const connection = await getMetaConnectionInfo(activeOrganizationId)
  if (!connection) return { error: 'Meta Ads no está conectado.', steps: empty, campaignId: null }

  const supabase = await createClient()

  // El horario es solo un start_time opcional — el estado inicial lo decide
  // el switch "Publicar activa" solo (más predecible que la regla del
  // legacy, donde con solo poner una fecha ya quedaba activa).
  const startTime = scheduleDatetime ? `${scheduleDatetime}:00` : undefined
  const status: 'ACTIVE' | 'PAUSED' = publishActive ? 'ACTIVE' : 'PAUSED'
  // ABO reparte el presupuesto total en partes iguales entre los conjuntos
  // distintos (no entre sus duplicados — cada copia usa el mismo monto que
  // su original, para que la comparación entre copias sea justa).
  const perAdSetBudget = budgetMode === 'abo' ? dailyBudget / Math.max(1, adSetInputs.length) : undefined

  const steps: LaunchStep[] = []
  const { token, account_id: accountId } = connection

  // 1. Campaña — si esto falla no hay nada más que intentar. Si se eligió
  // "sumar a una existente", nos salteamos la creación y usamos ese ID
  // directo (mismo comportamiento que el legacy con `ts-camp-existing-id`).
  let campaignId: string
  if (campaignMode === 'existing') {
    campaignId = existingCampaignId
    steps.push({ label: 'Campaña', ok: true, detail: 'Usando campaña existente' })
  } else {
    const campaignParams: Parameters<typeof createMetaCampaign>[2] = { name, objective, status, startTime }
    if (budgetMode === 'cbo') {
      campaignParams.dailyBudget = dailyBudget
      campaignParams.bidStrategy = bidStrategy
      campaignParams.bidAmount = bidAmount
    }
    const campaignResult = await createMetaCampaign(token, accountId, campaignParams)
    steps.push({ label: 'Campaña', ok: campaignResult.ok, detail: campaignResult.ok ? undefined : campaignResult.error })
    if (!campaignResult.ok) {
      await insertLaunchActivityLog(supabase, {
        organizationId: activeOrganizationId,
        userId,
        campaignId: null,
        campaignName: name,
        status: 'failed',
        steps,
      })
      return { error: `No se pudo crear la campaña: ${campaignResult.error}`, steps, campaignId: null }
    }
    campaignId = campaignResult.id
  }
  revalidatePath('/meta-ads/campaigns')

  // 2. Conjuntos + anuncios — tolerante a fallas parciales: si un conjunto o
  // un anuncio falla, seguimos con el resto y reportamos todo al final, en
  // vez de abortar y dejar a medio armar lo que sí venía bien.
  let anyFailure = false

  for (const adSetInput of adSetInputs) {
    for (let copyIndex = 1; copyIndex <= adSetInput.duplicateCount; copyIndex++) {
      const adSetLabel = adSetInput.duplicateCount > 1 ? `${adSetInput.name} (copia ${copyIndex})` : adSetInput.name

      const adSetResult = await createTestAdSet(token, accountId, campaignId, {
        name: adSetLabel,
        status,
        objective,
        dailyBudget: perAdSetBudget,
        bidStrategy,
        bidAmount,
        pixelId,
        audience: adSetInput.audience,
        placements,
        catalogOff: advPayload.catalogOff,
      })
      steps.push({ label: `Conjunto — ${adSetLabel}`, ok: adSetResult.ok, detail: adSetResult.ok ? undefined : adSetResult.error })
      if (!adSetResult.ok) {
        anyFailure = true
        continue
      }

      for (const ad of adSetInput.ads) {
        const adLabel = ad.name || adSetLabel
        let creativeResult: Awaited<ReturnType<typeof createTestAdCreative>> | null = null
        // Solo se llena en modo 'library' — si el anuncio termina de crearse
        // bien, esto es lo que le dice al activo "ya estás desplegado acá".
        let libraryDeploy: { assetId: string; metaImageHash?: string | null; metaVideoId?: string | null } | null = null

        if (ad.mode === 'library') {
          const asset = await getLibraryCreativeById(supabase, activeOrganizationId, ad.libraryAssetId as string)
          if (!asset || asset.status !== 'active') {
            steps.push({ label: `Creativo de Biblioteca — ${adLabel}`, ok: false, detail: 'Ese creativo ya no está disponible en la Biblioteca.' })
            anyFailure = true
            continue
          }

          const headline = ad.headline || asset.headline || ''
          const body = ad.body || asset.primaryText || ''
          const link = ad.link

          if (asset.assetType === 'image') {
            let imageHash = asset.metaImageHash
            if (!imageHash) {
              const fileRes = await fetch(asset.fileUrl)
              if (!fileRes.ok) {
                steps.push({ label: `Imagen de Biblioteca — ${adLabel}`, ok: false, detail: 'No pudimos descargar el creativo de la Biblioteca.' })
                anyFailure = true
                continue
              }
              const buffer = Buffer.from(await fileRes.arrayBuffer())
              const imageResult = await uploadMetaAdImage(token, accountId, buffer.toString('base64'))
              if (!imageResult.ok) {
                steps.push({ label: `Imagen de Biblioteca — ${adLabel}`, ok: false, detail: imageResult.error })
                anyFailure = true
                continue
              }
              imageHash = imageResult.hash
            }
            creativeResult = await createTestAdCreative(token, accountId, {
              name: `${adLabel} — Creativo`,
              pageId,
              imageHash,
              link,
              headline,
              body,
              cta: asset.cta,
              degreesOfFreedomSpec: advPayload.degreesOfFreedomSpec,
            })
            if (!creativeResult.ok) {
              steps.push({ label: `Creativo de Biblioteca — ${adLabel}`, ok: false, detail: creativeResult.error })
              anyFailure = true
              continue
            }
            libraryDeploy = { assetId: asset.id, metaImageHash: imageHash }
          } else {
            let videoId = asset.metaVideoId
            let thumbnailUrl: string | null = null
            if (!videoId) {
              const fileRes = await fetch(asset.fileUrl)
              if (!fileRes.ok) {
                steps.push({ label: `Video de Biblioteca — ${adLabel}`, ok: false, detail: 'No pudimos descargar el creativo de la Biblioteca.' })
                anyFailure = true
                continue
              }
              const buffer = Buffer.from(await fileRes.arrayBuffer())
              const uploaded = await uploadMetaAdVideo(token, accountId, buffer, asset.name)
              if (!uploaded.ok) {
                steps.push({ label: `Video de Biblioteca — ${adLabel}`, ok: false, detail: uploaded.error })
                anyFailure = true
                continue
              }
              videoId = uploaded.videoId
              const ready = await waitForMetaVideoReady(token, videoId)
              if (!ready.ok) {
                steps.push({ label: `Video de Biblioteca — ${adLabel}`, ok: false, detail: ready.error })
                anyFailure = true
                continue
              }
              thumbnailUrl = ready.thumbnailUrl
            }
            creativeResult = await createTestAdCreativeVideo(token, accountId, {
              name: `${adLabel} — Creativo`,
              pageId,
              videoId,
              thumbnailUrl,
              link,
              headline,
              body,
              cta: asset.cta,
              degreesOfFreedomSpec: advPayload.degreesOfFreedomSpec,
            })
            if (!creativeResult.ok) {
              steps.push({ label: `Creativo de Biblioteca — ${adLabel}`, ok: false, detail: creativeResult.error })
              anyFailure = true
              continue
            }
            libraryDeploy = { assetId: asset.id, metaVideoId: videoId }
          }
        } else if (ad.mode === 'existing') {
          // Ya validamos arriba que existingPostObjectStoryId está presente.
          creativeResult = await createTestAdCreativeFromExisting(token, accountId, {
            name: `${adLabel} — Creativo`,
            objectStoryId: ad.existingPostObjectStoryId as string,
          })
          if (!creativeResult.ok) {
            steps.push({ label: `Creativo (publicación existente) — ${adLabel}`, ok: false, detail: creativeResult.error })
            anyFailure = true
            continue
          }
        } else if (ad.mediaType === 'video') {
          // El video ya se subió y procesó antes de este submit (ver
          // /api/meta/upload-video) — ya validamos arriba que ad.videoId está presente.
          creativeResult = await createTestAdCreativeVideo(token, accountId, {
            name: `${adLabel} — Creativo`,
            pageId,
            videoId: ad.videoId as string,
            thumbnailUrl: ad.videoThumbnailUrl ?? null,
            link: ad.link,
            headline: ad.headline,
            body: ad.body,
            degreesOfFreedomSpec: advPayload.degreesOfFreedomSpec,
          })
          if (!creativeResult.ok) {
            steps.push({ label: `Creativo de video — ${adLabel}`, ok: false, detail: creativeResult.error })
            anyFailure = true
            continue
          }
        } else {
          // Ya validamos arriba que ad.image existe y tiene contenido.
          const buffer = Buffer.from(await (ad.image as File).arrayBuffer())
          const imageResult = await uploadMetaAdImage(token, accountId, buffer.toString('base64'))
          if (!imageResult.ok) {
            steps.push({ label: `Imagen — ${adLabel}`, ok: false, detail: imageResult.error })
            anyFailure = true
            continue
          }

          creativeResult = await createTestAdCreative(token, accountId, {
            name: `${adLabel} — Creativo`,
            pageId,
            imageHash: imageResult.hash,
            link: ad.link,
            headline: ad.headline,
            body: ad.body,
            degreesOfFreedomSpec: advPayload.degreesOfFreedomSpec,
          })
          if (!creativeResult.ok) {
            steps.push({ label: `Creativo — ${adLabel}`, ok: false, detail: creativeResult.error })
            anyFailure = true
            continue
          }
        }

        const adResult = await createTestAd(token, accountId, {
          name: adLabel,
          adsetId: adSetResult.id,
          creativeId: creativeResult.id,
          status,
        })
        steps.push({ label: `Anuncio — ${adLabel}`, ok: adResult.ok, detail: adResult.ok ? undefined : adResult.error })
        if (!adResult.ok) {
          anyFailure = true
        } else if (libraryDeploy) {
          await markLibraryCreativeDeployed(supabase, activeOrganizationId, libraryDeploy.assetId, {
            deployedAdId: adResult.id,
            metaImageHash: libraryDeploy.metaImageHash,
            metaVideoId: libraryDeploy.metaVideoId,
          })
        }
      }
    }
  }

  revalidatePath(`/meta-ads/campaigns/${campaignId}`)

  if (anyFailure) {
    await insertLaunchActivityLog(supabase, {
      organizationId: activeOrganizationId,
      userId,
      campaignId,
      campaignName: name,
      status: 'completed_with_errors',
      steps,
    })
    return {
      error: 'La campaña se creó, pero no todo salió bien — mirá el detalle de cada paso abajo.',
      steps,
      campaignId,
    }
  }

  await insertLaunchActivityLog(supabase, {
    organizationId: activeOrganizationId,
    userId,
    campaignId,
    campaignName: name,
    status: 'completed',
    steps,
  })

  redirect(`/meta-ads/campaigns/${campaignId}?campaign_success=1`)
}

export async function updateCampaignBudgetAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '')
  const budgetType = String(formData.get('budget_type') ?? '')
  const amount = Number(formData.get('amount'))
  const returnTo = String(formData.get('return_to') ?? `/meta-ads/campaigns/${campaignId}`)

  if (!campaignId || (budgetType !== 'daily' && budgetType !== 'lifetime') || !Number.isFinite(amount) || amount <= 0) {
    redirect(withError(returnTo, 'Ingresá un presupuesto válido.'))
  }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) {
    redirect(withError(returnTo, 'No encontramos tu organización activa.'))
  }

  const token = await getMetaToken(activeOrganizationId)
  if (!token) {
    redirect(withError(returnTo, 'Meta Ads no está conectado.'))
  }

  const result = await updateMetaCampaignBudget(
    token,
    campaignId,
    budgetType === 'lifetime' ? { lifetimeBudget: amount } : { dailyBudget: amount }
  )

  revalidatePath(`/meta-ads/campaigns/${campaignId}`)
  revalidatePath('/meta-ads/campaigns')

  if (!result.ok) {
    redirect(withError(returnTo, result.error))
  }

  redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}campaign_success=1`)
}
