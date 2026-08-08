'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import type { Database } from '@/lib/types/database.types'
import {
  updateMetaCampaignStatus,
  updateMetaCampaignBudget,
  createMetaCampaign,
  updateMetaAdSetStatus,
  updateMetaAdStatus,
  getMetaEntityDailyInsights,
} from '@/lib/meta/campaigns'
import { computeFatigueSignal, type FatigueSignal } from '@/lib/meta/fatigue'
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
  createTestAdCreativeFromInstagramPost,
  buildAdvantagePayload,
  ADV_CONTROLS,
  ADV_CONTROLS_DEFAULT,
  getMetaPages,
  getMetaExistingPosts,
  type AdvControlKey,
  type AdvControls,
  type AudienceSpec,
  type MetaPage,
  type MetaExistingPost,
} from '@/lib/meta/ad-launch'
import { getLibraryCreativeById, markLibraryCreativeDeployed, getLibraryCreatives, type LibraryCreative } from '@/lib/meta/library'
import { insertLaunchActivityLog } from '@/lib/meta/history'
import { duplicateMetaAdSetForCreativeTest } from '@/lib/meta/adset-duplicate'
import { upsertCampaignPillar } from '@/lib/meta/campaign-pillars'
import { NOTE_COLORS } from '../../notes/note-constants'

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

/** instagram_actor_id real para "Publicitar un posteo orgánico" — null si Instagram no está conectado (tabla/flujo separados de meta_connections, ver instagram_connections). */
async function getInstagramActorId(activeOrganizationId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('instagram_connections')
    .select('ig_user_id')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()
  return data?.ig_user_id ?? null
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
  mode: 'new' | 'existing' | 'library' | 'instagram_post'
  link: string
  headline: string
  body: string
  mediaType: 'image' | 'video'
  image: File | null
  videoId?: string
  videoThumbnailUrl?: string
  existingPostObjectStoryId?: string
  libraryAssetId?: string
  /** Solo en modo 'instagram_post' — ig_media_id real de instagram_media_catalog. */
  igMediaId?: string
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
      const mode =
        modeRaw === 'existing' || modeRaw === 'library' || modeRaw === 'instagram_post' ? modeRaw : 'new'
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
        igMediaId: String(formData.get(`ad_ig_media_id_${i}_${j}`) ?? '').trim() || undefined,
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

/**
 * Crea UN anuncio (imagen/video/reuso de publicación/Biblioteca) dentro de
 * un ad set ya existente. Extraído de launchTestCampaignAction (2026-08-06)
 * para reusarlo tal cual desde addAdToAdSetAction — la "Duplicación
 * Inteligente de Conjuntos" abre un conjunto vacío y necesita exactamente
 * esta misma cadena (subir creativo → crear creative → crear ad) para
 * llenarlo, sin duplicar los ~170 líneas de orquestación con Meta.
 */
export async function createSingleAd(params: {
  token: string
  accountId: string
  pageId: string
  adSetId: string
  ad: AdInput
  adLabel: string
  status: 'ACTIVE' | 'PAUSED'
  advPayload: ReturnType<typeof buildAdvantagePayload>
  supabase: Awaited<ReturnType<typeof createClient>>
  activeOrganizationId: string
  /** Solo hace falta si algún ad viene en modo 'instagram_post' — ver ad.mode abajo. */
  igActorId?: string | null
}): Promise<{ ok: boolean; steps: LaunchStep[]; adId?: string }> {
  const { token, accountId, pageId, adSetId, ad, adLabel, status, advPayload, supabase, activeOrganizationId, igActorId } = params
  const steps: LaunchStep[] = []
  let creativeResult: Awaited<ReturnType<typeof createTestAdCreative>> | null = null
  // Solo se llena en modo 'library' — si el anuncio termina de crearse bien,
  // esto es lo que le dice al activo "ya estás desplegado acá".
  let libraryDeploy: { assetId: string; metaImageHash?: string | null; metaVideoId?: string | null } | null = null

  if (ad.mode === 'library') {
    const asset = await getLibraryCreativeById(supabase, activeOrganizationId, ad.libraryAssetId as string)
    if (!asset || asset.status !== 'active') {
      steps.push({ label: `Creativo de Biblioteca — ${adLabel}`, ok: false, detail: 'Ese creativo ya no está disponible en la Biblioteca.' })
      return { ok: false, steps }
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
          return { ok: false, steps }
        }
        const buffer = Buffer.from(await fileRes.arrayBuffer())
        const imageResult = await uploadMetaAdImage(token, accountId, buffer.toString('base64'))
        if (!imageResult.ok) {
          steps.push({ label: `Imagen de Biblioteca — ${adLabel}`, ok: false, detail: imageResult.error })
          return { ok: false, steps }
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
        return { ok: false, steps }
      }
      libraryDeploy = { assetId: asset.id, metaImageHash: imageHash }
    } else {
      let videoId = asset.metaVideoId
      let thumbnailUrl: string | null = null
      if (!videoId) {
        const fileRes = await fetch(asset.fileUrl)
        if (!fileRes.ok) {
          steps.push({ label: `Video de Biblioteca — ${adLabel}`, ok: false, detail: 'No pudimos descargar el creativo de la Biblioteca.' })
          return { ok: false, steps }
        }
        const buffer = Buffer.from(await fileRes.arrayBuffer())
        const uploaded = await uploadMetaAdVideo(token, accountId, buffer, asset.name)
        if (!uploaded.ok) {
          steps.push({ label: `Video de Biblioteca — ${adLabel}`, ok: false, detail: uploaded.error })
          return { ok: false, steps }
        }
        videoId = uploaded.videoId
        const ready = await waitForMetaVideoReady(token, videoId)
        if (!ready.ok) {
          steps.push({ label: `Video de Biblioteca — ${adLabel}`, ok: false, detail: ready.error })
          return { ok: false, steps }
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
        return { ok: false, steps }
      }
      libraryDeploy = { assetId: asset.id, metaVideoId: videoId }
    }
  } else if (ad.mode === 'existing') {
    // El caller ya validó que existingPostObjectStoryId está presente.
    creativeResult = await createTestAdCreativeFromExisting(token, accountId, {
      name: `${adLabel} — Creativo`,
      objectStoryId: ad.existingPostObjectStoryId as string,
    })
    if (!creativeResult.ok) {
      steps.push({ label: `Creativo (publicación existente) — ${adLabel}`, ok: false, detail: creativeResult.error })
      return { ok: false, steps }
    }
  } else if (ad.mode === 'instagram_post') {
    // "Publicitar un posteo orgánico" (2026-08-06) — el caller ya validó
    // que igMediaId está presente. igActorId siempre debería venir seteado
    // acá (el modo no se ofrece en la UI si no hay Instagram conectado),
    // pero se valida igual por las dudas de que el form llegue armado a
    // mano o con datos viejos.
    if (!igActorId) {
      steps.push({ label: `Publicación de Instagram — ${adLabel}`, ok: false, detail: 'Instagram no está conectado.' })
      return { ok: false, steps }
    }
    creativeResult = await createTestAdCreativeFromInstagramPost(token, accountId, {
      name: `${adLabel} — Creativo`,
      igActorId,
      igMediaId: ad.igMediaId as string,
    })
    if (!creativeResult.ok) {
      steps.push({ label: `Publicación de Instagram — ${adLabel}`, ok: false, detail: creativeResult.error })
      return { ok: false, steps }
    }
  } else if (ad.mediaType === 'video') {
    // El video ya se subió y procesó antes de este submit (ver
    // /api/meta/upload-video) — el caller ya validó que ad.videoId está presente.
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
      return { ok: false, steps }
    }
  } else {
    // El caller ya validó que ad.image existe y tiene contenido.
    const buffer = Buffer.from(await (ad.image as File).arrayBuffer())
    const imageResult = await uploadMetaAdImage(token, accountId, buffer.toString('base64'))
    if (!imageResult.ok) {
      steps.push({ label: `Imagen — ${adLabel}`, ok: false, detail: imageResult.error })
      return { ok: false, steps }
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
      return { ok: false, steps }
    }
  }

  const adResult = await createTestAd(token, accountId, {
    name: adLabel,
    adsetId: adSetId,
    creativeId: creativeResult.id,
    status,
  })
  steps.push({ label: `Anuncio — ${adLabel}`, ok: adResult.ok, detail: adResult.ok ? undefined : adResult.error })
  if (adResult.ok && libraryDeploy) {
    await markLibraryCreativeDeployed(supabase, activeOrganizationId, libraryDeploy.assetId, {
      deployedAdId: adResult.id,
      metaImageHash: libraryDeploy.metaImageHash,
      metaVideoId: libraryDeploy.metaVideoId,
    })
  }
  // "Ranking de Ganadores Cross-Cuenta" (2026-08-07, Innovación Radical #4)
  // — para poder cerrar el círculo Contenido→Ads más adelante (ver
  // markAdAsContentWinnerAction) hace falta saber de qué publicación
  // orgánica nació este anuncio DESPUÉS de creado, cuando ya está en la
  // tabla de Anuncios — Meta no expone ese dato de vuelta en una lectura
  // simple, así que se guarda acá mismo, en el único momento en que
  // tenemos los dos IDs juntos. Falla silenciosa a propósito: no vale la
  // pena romper el lanzamiento del anuncio (que ya salió bien en Meta) por
  // un insert de trazabilidad que no es crítico.
  if (adResult.ok && ad.mode === 'instagram_post' && ad.igMediaId) {
    await supabase
      .from('ad_creative_origins')
      .insert({ organization_id: activeOrganizationId, ad_id: adResult.id, ig_media_id: ad.igMediaId })
  }
  return { ok: adResult.ok, steps, adId: adResult.ok ? adResult.id : undefined }
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
  const pillar = String(formData.get('pillar') ?? '').trim()

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
      if (ad.mode === 'instagram_post') {
        if (!ad.igMediaId) {
          return { error: `Elegí qué publicación de Instagram publicitar en "${adSet.name}".`, steps: empty, campaignId: null }
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

  const igActorId = await getInstagramActorId(activeOrganizationId)

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

  // "Pilares Estratégicos" (2026-08-07) — se guarda tanto si la campaña es
  // nueva como si se está sumando a una existente (en ese caso, reasigna el
  // pilar de la campaña elegida). Sin bloquear el lanzamiento si falla: ya
  // se creó/identificó bien la campaña real en Meta, perder esa creación por
  // un problema de trazabilidad sería peor que no guardar el pilar.
  if (pillar) {
    await upsertCampaignPillar(supabase, activeOrganizationId, campaignId, pillar)
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
        const adResult = await createSingleAd({
          token,
          accountId,
          pageId,
          adSetId: adSetResult.id,
          ad,
          adLabel,
          status,
          advPayload,
          supabase,
          activeOrganizationId,
          igActorId,
        })
        steps.push(...adResult.steps)
        if (!adResult.ok) anyFailure = true
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

// ---------------------------------------------------------------------------
// "Pilares Estratégicos" — edición inline desde el detalle de una campaña
// (2026-08-07). Mismo mecanismo que el wizard (upsertCampaignPillar), acá
// disparado por el editor inline de campaign-pillar-editor.tsx en vez de un
// submit de formulario completo.
// ---------------------------------------------------------------------------

export type SaveCampaignPillarResult = { ok: true } | { ok: false; error: string }

export async function saveCampaignPillarAction(campaignId: string, pillar: string): Promise<SaveCampaignPillarResult> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }
  if (!pillar.trim()) return { ok: false, error: 'Elegí un pilar.' }

  const supabase = await createClient()
  const success = await upsertCampaignPillar(supabase, activeOrganizationId, campaignId, pillar.trim())
  if (!success) return { ok: false, error: 'No pudimos guardar el pilar. Probá de nuevo.' }

  revalidatePath(`/meta-ads/campaigns/${campaignId}`)
  revalidatePath('/meta-ads/campaigns')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// "Escalabilidad a un Clic" (2026-08-07, Innovación Radical #2) — un botón
// directo sobre la fila de una campaña que ya viene ganando (mismo criterio
// 'escalar' que ya calcula getStrategicStatus/StrategicStatusDot, ver
// autopilot.ts — no se inventa un umbral nuevo acá) para subirle presupuesto
// +20% sin abrir el editor inline ni calcular el monto a mano. Reusa
// updateMetaCampaignBudget, el mismo mutator que ya usa
// updateCampaignBudgetAction — mismo contrato ok/error, mismo patrón de
// redirect con campaign_success/campaign_error.
// ---------------------------------------------------------------------------

const SCALE_UP_FACTOR = 1.2

export async function scaleCampaignBudgetAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '')
  const budgetType = String(formData.get('budget_type') ?? '')
  const currentAmount = Number(formData.get('current_amount'))
  const returnTo = String(formData.get('return_to') ?? `/meta-ads/campaigns/${campaignId}`)

  if (!campaignId || (budgetType !== 'daily' && budgetType !== 'lifetime') || !Number.isFinite(currentAmount) || currentAmount <= 0) {
    redirect(withError(returnTo, 'No pudimos calcular el nuevo presupuesto.'))
  }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) {
    redirect(withError(returnTo, 'No encontramos tu organización activa.'))
  }

  const token = await getMetaToken(activeOrganizationId)
  if (!token) {
    redirect(withError(returnTo, 'Meta Ads no está conectado.'))
  }

  const newAmount = Math.round(currentAmount * SCALE_UP_FACTOR)
  const result = await updateMetaCampaignBudget(
    token,
    campaignId,
    budgetType === 'lifetime' ? { lifetimeBudget: newAmount } : { dailyBudget: newAmount }
  )

  revalidatePath(`/meta-ads/campaigns/${campaignId}`)
  revalidatePath('/meta-ads/campaigns')

  if (!result.ok) {
    redirect(withError(returnTo, result.error))
  }

  redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}campaign_success=1`)
}

// ---------------------------------------------------------------------------
// "Predicción de Fatiga" (2026-08-07, Innovación Radical #3) — bajo pedido,
// no automático para toda la tabla: FatigueBadge la dispara solo para
// anuncios ACTIVE con gasto real (ver ads-workspace.tsx), así que en la
// práctica es como mucho una llamada por fila visible, nunca una barrida de
// la cuenta entera. Reusa getMetaEntityDailyInsights (ya existe, Snapshots
// la usa igual) en vez de inventar un fetch nuevo — ver computeFatigueSignal
// (fatigue.ts) para el criterio de detección.
// ---------------------------------------------------------------------------

const FATIGUE_LOOKBACK_DAYS = 14

export type AdFatigueActionResult = { ok: true; signal: FatigueSignal | null } | { ok: false; error: string }

export async function getAdFatigueSignalAction(adId: string): Promise<AdFatigueActionResult> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const token = await getMetaToken(activeOrganizationId)
  if (!token) return { ok: false, error: 'Meta Ads no está conectado.' }

  const until = new Date()
  const since = new Date(until.getTime() - FATIGUE_LOOKBACK_DAYS * 86400000)
  const result = await getMetaEntityDailyInsights(token, adId, { since, until })
  if (!result.ok) return result

  return { ok: true, signal: computeFatigueSignal(result.days) }
}

// ---------------------------------------------------------------------------
// "Ranking de Ganadores Cross-Cuenta" (2026-08-07, Innovación Radical #4) —
// cierra el círculo Contenido→Ads: cuando un anuncio nacido de un posteo
// orgánico (ver ad_creative_origins, poblada en createSingleAd) resulta
// ganador, esto lo avisa de vuelta al equipo de Contenido como una Nota
// (categoría "Conceptos claves") — mismo mecanismo ya probado en
// content/actions.ts (generateContentIdeaAction guarda ideas de IA en
// Notas). roas/cpa/adName/campaignName vienen del caller (ya están en la
// fila de la tabla de Anuncios) para no pedirle a Meta un dato que ya
// tenemos.
// ---------------------------------------------------------------------------

export type MarkAdWinnerActionResult = { ok: true } | { ok: false; error: string }

export async function markAdAsContentWinnerAction(params: {
  adId: string
  adName: string
  campaignName: string
  roas: number
  cpa: number
}): Promise<MarkAdWinnerActionResult> {
  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()

  const { data: origin } = await supabase
    .from('ad_creative_origins')
    .select('ig_media_id')
    .eq('organization_id', activeOrganizationId)
    .eq('ad_id', params.adId)
    .maybeSingle()

  if (!origin) return { ok: false, error: 'Este anuncio no tiene un posteo orgánico de origen registrado.' }

  const { data: post } = await supabase
    .from('instagram_media_catalog')
    .select('caption, permalink')
    .eq('organization_id', activeOrganizationId)
    .eq('ig_media_id', origin.ig_media_id)
    .maybeSingle()

  const captionSnippet = post?.caption
    ? `"${post.caption.length > 80 ? `${post.caption.slice(0, 80)}…` : post.caption}"`
    : 'este posteo'
  const linkLine = post?.permalink ? ` (${post.permalink})` : ''

  const contenido = `El posteo orgánico ${captionSnippet}${linkLine} funcionó tan bien que lo publicitamos en "${params.campaignName}" (anuncio "${params.adName}") y da ROAS ${params.roas.toFixed(2)}x / CPA $${params.cpa.toFixed(0)} — repetí este tipo de contenido.`

  const { error } = await supabase.from('notes').insert({
    organization_id: activeOrganizationId,
    user_id: userId,
    titulo: 'Post ganador en pauta',
    contenido,
    categoria: 'conceptos',
    color: NOTE_COLORS[4],
  })

  if (error) return { ok: false, error: 'No pudimos guardar la nota. Probá de nuevo.' }

  revalidatePath('/notes')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// "Duplicación Inteligente de Conjuntos" (2026-08-06) — Feature Killer para
// el Media Buyer: un conjunto nuevo con la MISMA configuración (audiencia,
// presupuesto, ubicaciones, optimización) que el original pero sin ningún
// anuncio, listo para subir un creativo nuevo y testearlo aprovechando el
// aprendizaje del conjunto original — sin tener que armar todo de cero ni
// borrar manualmente lo viejo (nunca se copia, así que no hay nada que
// borrar).
// ---------------------------------------------------------------------------

export type DuplicateAdSetActionResult =
  | { ok: true; newAdSetId: string; newAdSetName: string }
  | { ok: false; error: string }

export async function duplicateAdSetForCreativeTestAction(
  adSetId: string,
  campaignId: string
): Promise<DuplicateAdSetActionResult> {
  if (!adSetId || !campaignId) return { ok: false, error: 'Faltan datos del conjunto a duplicar.' }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const connection = await getMetaConnectionInfo(activeOrganizationId)
  if (!connection) return { ok: false, error: 'Meta Ads no está conectado.' }

  const result = await duplicateMetaAdSetForCreativeTest(connection.token, connection.account_id, adSetId, campaignId)

  if (result.ok) revalidatePath(`/meta-ads/campaigns/${campaignId}`)

  return result
}

export type AddAdModalData =
  | {
      ok: true
      pages: MetaPage[]
      existingPosts: MetaExistingPost[]
      scripts: ScriptOptionRow[]
      libraryCreatives: LibraryCreative[]
      instagramPosts: InstagramPostRow[]
      igActorId: string | null
    }
  | { ok: false; error: string }

type ScriptOptionRow = { id: string; title: string | null; hook: string | null; body: string | null; copy_feed: string | null }
type InstagramPostRow = Database['public']['Tables']['instagram_media_catalog']['Row']

/** Mismos datos que el wizard completo necesita para AdEditor, sin lo que ya no hace falta (pixels, audiencias, campañas existentes) — el conjunto y su targeting ya están fijados por la duplicación. */
export async function getAddAdModalDataAction(): Promise<AddAdModalData> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const connection = await getMetaConnectionInfo(activeOrganizationId)
  if (!connection) return { ok: false, error: 'Meta Ads no está conectado.' }

  const supabase = await createClient()
  const [pagesResult, existingPostsResult, scriptsResult, libraryResult, instagramConnectionResult, instagramPostsResult] = await Promise.all([
    getMetaPages(connection.token),
    getMetaExistingPosts(connection.token, connection.account_id),
    supabase
      .from('scripts')
      .select('id, title, hook, body, copy_feed')
      .eq('organization_id', activeOrganizationId)
      .order('updated_at', { ascending: false }),
    getLibraryCreatives(supabase, activeOrganizationId),
    supabase.from('instagram_connections').select('ig_user_id').eq('organization_id', activeOrganizationId).maybeSingle(),
    supabase
      .from('instagram_media_catalog')
      .select('*')
      .eq('organization_id', activeOrganizationId)
      .order('posted_at', { ascending: false, nullsFirst: false })
      .limit(30),
  ])

  if (!pagesResult.ok) return { ok: false, error: pagesResult.error }

  return {
    ok: true,
    pages: pagesResult.pages,
    existingPosts: existingPostsResult.ok ? existingPostsResult.posts : [],
    scripts: scriptsResult.data ?? [],
    instagramPosts: (instagramPostsResult.data ?? []).filter((p) => p.media_url && p.media_type !== 'CAROUSEL_ALBUM'),
    igActorId: instagramConnectionResult.data?.ig_user_id ?? null,
    libraryCreatives: libraryResult.filter((c) => c.status === 'active'),
  }
}

export type AddAdToAdSetState = { error: string | null; success: boolean }

/**
 * Llena el conjunto vacío que dejó duplicateAdSetForCreativeTestAction —
 * mismo parseo de campos que AdEditor ya arma (prefijo `0_0`, ver
 * parseAdSets) y el mismo createSingleAd que usa el wizard completo.
 */
export async function addAdToAdSetAction(
  adSetId: string,
  campaignId: string,
  _prevState: AddAdToAdSetState,
  formData: FormData
): Promise<AddAdToAdSetState> {
  if (!adSetId || !campaignId) return { error: 'Faltan datos del conjunto.', success: false }
  // Va como input oculto del form (no bindeado) — así siempre viaja el valor
  // vigente en el momento del submit, sin depender de que el bind capture un
  // valor de estado que todavía no se había resuelto cuando se armó la acción.
  const pageId = String(formData.get('page_id') ?? '').trim()
  if (!pageId) return { error: 'Elegí con qué Página de Facebook vas a publicar el anuncio.', success: false }

  const modeRaw = String(formData.get('ad_mode_0_0') ?? 'new')
  const mode =
    modeRaw === 'existing' || modeRaw === 'library' || modeRaw === 'instagram_post' ? modeRaw : 'new'
  const mediaType = String(formData.get('ad_media_type_0_0') ?? 'image') === 'video' ? 'video' : 'image'
  const ad: AdInput = {
    name: String(formData.get('ad_name_0_0') ?? '').trim(),
    mode,
    link: String(formData.get('ad_link_0_0') ?? '').trim(),
    headline: String(formData.get('ad_headline_0_0') ?? '').trim(),
    body: String(formData.get('ad_body_0_0') ?? '').trim(),
    mediaType,
    image: formData.get('ad_image_0_0') as File | null,
    videoId: String(formData.get('ad_video_id_0_0') ?? '').trim() || undefined,
    videoThumbnailUrl: String(formData.get('ad_video_thumbnail_0_0') ?? '').trim() || undefined,
    existingPostObjectStoryId: String(formData.get('ad_existing_post_0_0') ?? '').trim() || undefined,
    libraryAssetId: String(formData.get('ad_library_id_0_0') ?? '').trim() || undefined,
    igMediaId: String(formData.get('ad_ig_media_id_0_0') ?? '').trim() || undefined,
  }

  if (ad.mode === 'existing') {
    if (!ad.existingPostObjectStoryId) return { error: 'Elegí qué publicación reusar.', success: false }
  } else if (ad.mode === 'library') {
    if (!ad.libraryAssetId) return { error: 'Elegí qué creativo de la Biblioteca usar.', success: false }
  } else if (ad.mode === 'instagram_post') {
    if (!ad.igMediaId) return { error: 'Elegí qué publicación de Instagram publicitar.', success: false }
  } else {
    if (!ad.body) return { error: 'Falta el copy del anuncio.', success: false }
    if (!ad.link) return { error: 'Falta el link de destino del anuncio.', success: false }
    if (ad.mediaType === 'image' && (!ad.image || ad.image.size === 0)) {
      return { error: 'Falta la imagen del anuncio.', success: false }
    }
    if (ad.mediaType === 'video' && !ad.videoId) {
      return { error: 'Esperá a que el video termine de subirse (tiene que quedar en verde) antes de guardar.', success: false }
    }
  }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { error: 'No encontramos tu organización activa.', success: false }

  const connection = await getMetaConnectionInfo(activeOrganizationId)
  if (!connection) return { error: 'Meta Ads no está conectado.', success: false }

  const igActorId = await getInstagramActorId(activeOrganizationId)

  const supabase = await createClient()
  const advPayload = buildAdvantagePayload(ADV_CONTROLS_DEFAULT)

  const result = await createSingleAd({
    token: connection.token,
    accountId: connection.account_id,
    pageId,
    adSetId,
    ad,
    adLabel: ad.name || 'Anuncio',
    status: 'PAUSED',
    advPayload,
    supabase,
    activeOrganizationId,
    igActorId,
  })

  if (!result.ok) {
    const detail = result.steps.find((s) => !s.ok)?.detail
    return { error: detail || 'No pudimos crear el anuncio. Probá de nuevo.', success: false }
  }

  revalidatePath(`/meta-ads/campaigns/${campaignId}`)
  return { error: null, success: true }
}
