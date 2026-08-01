'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { parseScheduledAt } from '@/lib/instagram/scheduling'
import { validateMediaFile } from '@/lib/media/validate-upload'

type MediaItem = { url: string; type: 'image' | 'video' }

// Bucket "piezas-media" (público) — mismo path que app.html:
// {user_id}/{timestamp}-{random}.{ext}.
async function uploadPieceMediaFiles(
  supabase: SupabaseClient,
  userId: string,
  files: File[]
): Promise<{ media: MediaItem[]; error: string | null }> {
  const media: MediaItem[] = []

  for (const file of files) {
    const validation = await validateMediaFile(file)
    if (!validation.ok) {
      return { media, error: validation.error }
    }

    const ext = file.name.split('.').pop() || 'bin'
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error: uploadError } = await supabase.storage.from('piezas-media').upload(path, file)

    if (uploadError) {
      return { media, error: `No pudimos subir "${file.name}". Probá de nuevo.` }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('piezas-media').getPublicUrl(path)

    media.push({ url: publicUrl, type: validation.kind })
  }

  return { media, error: null }
}

export type SaveState = {
  error: string | null
  success: boolean
}

const emptyToNull = (value: FormDataEntryValue | null) => {
  const str = typeof value === 'string' ? value.trim() : ''
  return str || null
}

export async function updateCampaignDetailsAction(
  _prevState: SaveState,
  formData: FormData
): Promise<SaveState> {
  const campaignId = String(formData.get('campaign_id') ?? '')
  const nombre = String(formData.get('nombre') ?? '').trim()

  if (!campaignId) {
    return { error: 'Falta el id de la campaña.', success: false }
  }

  if (!nombre) {
    return { error: 'La campaña necesita un nombre.', success: false }
  }

  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.', success: false }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('content_campaigns')
    .update({
      nombre,
      periodo: emptyToNull(formData.get('periodo')),
      fecha_inicio: emptyToNull(formData.get('fecha_inicio')),
      fecha_fin: emptyToNull(formData.get('fecha_fin')),
      status: String(formData.get('status') ?? 'planificacion'),
      objetivo: emptyToNull(formData.get('objetivo')),
      concepto_estrategico: emptyToNull(formData.get('concepto_estrategico')),
      concepto_creativo: emptyToNull(formData.get('concepto_creativo')),
      desarrollo: emptyToNull(formData.get('desarrollo')),
      notas: emptyToNull(formData.get('notas')),
      formatos: formData.getAll('formatos').map(String),
    })
    .eq('id', campaignId)
    .eq('organization_id', activeOrganizationId)

  if (error) {
    return { error: 'No pudimos guardar los cambios. Probá de nuevo.', success: false }
  }

  revalidatePath(`/campaigns/${campaignId}`)
  return { error: null, success: true }
}

export type CreatePieceState = {
  error: string | null
  success: boolean
}

const PRODUCTION_STATUSES = ['idea', 'por_grabar', 'listo_para_programar', 'programado', 'publicado']

export async function createPieceAction(
  _prevState: CreatePieceState,
  formData: FormData
): Promise<CreatePieceState> {
  const campaignId = String(formData.get('campaign_id') ?? '')
  const titulo = String(formData.get('titulo') ?? '').trim()

  if (!campaignId) {
    return { error: 'Falta el id de la campaña.', success: false }
  }

  if (!titulo) {
    return { error: 'Ingresá un título para la pieza.', success: false }
  }

  const { iso: scheduledAt, error: scheduleError } = parseScheduledAt(formData)
  if (scheduleError) {
    return { error: scheduleError, success: false }
  }

  const { iso: tiktokScheduledAt, error: tiktokScheduleError } = parseScheduledAt(formData, 'tiktok_')
  if (tiktokScheduleError) {
    return { error: tiktokScheduleError, success: false }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.', success: false }
  }

  // Archivo Final — un solo archivo (Épica Omnicanal, 2026-08-04).
  const finalFiles = formData
    .getAll('media_files')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
    .slice(0, 1)

  if (scheduledAt && finalFiles.length === 0) {
    return { error: 'Para programar la auto-publicación, subí el Archivo Final que se va a publicar.', success: false }
  }

  const { media: mediaUrls, error: uploadError } = await uploadPieceMediaFiles(supabase, user.id, finalFiles)

  if (uploadError) {
    return { error: uploadError, success: false }
  }

  // Referencias — multi-archivo, nunca las lee el pipeline de publicación.
  const referenceFiles = formData
    .getAll('reference_files')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

  const { media: referenceUrls, error: referenceUploadError } = await uploadPieceMediaFiles(supabase, user.id, referenceFiles)

  if (referenceUploadError) {
    return { error: referenceUploadError, success: false }
  }

  const productionStatusRaw = String(formData.get('production_status') ?? 'idea')

  const { error } = await supabase.from('content_piezas').insert({
    campaign_id: campaignId,
    titulo,
    formato: emptyToNull(formData.get('formato')),
    plataforma: emptyToNull(formData.get('plataforma')),
    fecha_planificada: emptyToNull(formData.get('fecha_planificada')),
    turno: emptyToNull(formData.get('turno')),
    protagonista: emptyToNull(formData.get('protagonista')),
    notas: emptyToNull(formData.get('notas')),
    caption: emptyToNull(formData.get('caption')),
    tiktok_caption: emptyToNull(formData.get('tiktok_caption')),
    status: 'pendiente',
    production_status: PRODUCTION_STATUSES.includes(productionStatusRaw) ? productionStatusRaw : 'idea',
    user_id: user.id,
    organization_id: activeOrganizationId,
    media_urls: mediaUrls.length > 0 ? mediaUrls : null,
    media_url: mediaUrls[0]?.url ?? null,
    media_type: mediaUrls[0]?.type ?? null,
    reference_urls: referenceUrls,
    scheduled_at: scheduledAt,
    publish_status: scheduledAt ? 'scheduled' : 'none',
    tiktok_scheduled_at: tiktokScheduledAt,
    tiktok_publish_status: tiktokScheduledAt ? 'scheduled' : 'none',
  })

  if (error) {
    return { error: 'No pudimos crear la pieza. Probá de nuevo.', success: false }
  }

  revalidatePath(`/campaigns/${campaignId}`)
  revalidatePath('/content')
  return { error: null, success: true }
}

export type AddMediaState = {
  error: string | null
}

/**
 * Sube más archivos a una pieza ya creada — piece-edit-form.tsx no tiene
 * input de archivo propio, esto es lo único que agrega media después de la
 * creación (ver add-piece-media-form.tsx). `kind` distingue Archivo Final
 * (single, REEMPLAZA lo que había) de Referencias (multi, se acumula) —
 * mismo criterio que createPieceAction/content/actions.ts para publicaciones
 * sueltas (Épica Omnicanal, 2026-08-04).
 */
export async function addPieceMediaAction(
  pieceId: string,
  campaignId: string,
  kind: 'final' | 'reference',
  _prevState: AddMediaState,
  formData: FormData
): Promise<AddMediaState> {
  const rawFiles = formData
    .getAll('media_files')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
  const files = kind === 'final' ? rawFiles.slice(0, 1) : rawFiles

  if (files.length === 0) {
    return { error: 'Elegí al menos un archivo.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.' }
  }

  const { data: existingPiece } = await supabase
    .from('content_piezas')
    .select('media_urls, reference_urls')
    .eq('id', pieceId)
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  if (!existingPiece) {
    return { error: 'No encontramos la pieza.' }
  }

  const { media: newMedia, error: uploadError } = await uploadPieceMediaFiles(supabase, user.id, files)

  if (uploadError) {
    return { error: uploadError }
  }

  if (kind === 'final') {
    const { error } = await supabase
      .from('content_piezas')
      .update({
        media_urls: newMedia,
        media_url: newMedia[0]?.url ?? null,
        media_type: newMedia[0]?.type ?? null,
      })
      .eq('id', pieceId)
      .eq('organization_id', activeOrganizationId)

    if (error) {
      return { error: 'No pudimos guardar el archivo. Probá de nuevo.' }
    }
  } else {
    const existingReference = Array.isArray(existingPiece.reference_urls)
      ? (existingPiece.reference_urls as MediaItem[])
      : []
    const mergedReference = [...existingReference, ...newMedia]

    const { error } = await supabase
      .from('content_piezas')
      .update({ reference_urls: mergedReference })
      .eq('id', pieceId)
      .eq('organization_id', activeOrganizationId)

    if (error) {
      return { error: 'No pudimos guardar las referencias. Probá de nuevo.' }
    }
  }

  revalidatePath(`/campaigns/${campaignId}`)
  return { error: null }
}

export async function togglePieceStatusAction(
  pieceId: string,
  campaignId: string,
  nextStatus: string
) {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return
  }

  const supabase = await createClient()

  await supabase
    .from('content_piezas')
    .update({ status: nextStatus })
    .eq('id', pieceId)
    .eq('organization_id', activeOrganizationId)

  revalidatePath(`/campaigns/${campaignId}`)
}

export type UpdatePieceState = {
  error: string | null
  success: boolean
}

export async function updatePieceAction(
  pieceId: string,
  campaignId: string,
  _prevState: UpdatePieceState,
  formData: FormData
): Promise<UpdatePieceState> {
  const titulo = String(formData.get('titulo') ?? '').trim()

  if (!titulo) {
    return { error: 'La pieza necesita un título.', success: false }
  }

  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.', success: false }
  }

  const supabase = await createClient()

  const { iso: scheduledAt, error: scheduleError } = parseScheduledAt(formData)
  if (scheduleError) {
    return { error: scheduleError, success: false }
  }

  const { iso: tiktokScheduledAt, error: tiktokScheduleError } = parseScheduledAt(formData, 'tiktok_')
  if (tiktokScheduleError) {
    return { error: tiktokScheduleError, success: false }
  }

  if (scheduledAt) {
    const { data: existingPiece } = await supabase
      .from('content_piezas')
      .select('media_url, publish_status')
      .eq('id', pieceId)
      .eq('organization_id', activeOrganizationId)
      .maybeSingle()

    if (existingPiece?.publish_status === 'publishing' || existingPiece?.publish_status === 'published') {
      return { error: 'Esta pieza ya se está publicando o ya se publicó — no se puede reprogramar.', success: false }
    }
    if (!existingPiece?.media_url) {
      return { error: 'Para programar la auto-publicación, primero subí el Archivo Final que se va a publicar.', success: false }
    }
  }

  const productionStatusRaw = String(formData.get('production_status') ?? 'idea')

  const { error } = await supabase
    .from('content_piezas')
    .update({
      titulo,
      formato: emptyToNull(formData.get('formato')),
      plataforma: emptyToNull(formData.get('plataforma')),
      fecha_planificada: emptyToNull(formData.get('fecha_planificada')),
      turno: emptyToNull(formData.get('turno')),
      protagonista: emptyToNull(formData.get('protagonista')),
      notas: emptyToNull(formData.get('notas')),
      caption: emptyToNull(formData.get('caption')),
      tiktok_caption: emptyToNull(formData.get('tiktok_caption')),
      production_status: PRODUCTION_STATUSES.includes(productionStatusRaw) ? productionStatusRaw : 'idea',
      scheduled_at: scheduledAt,
      publish_status: scheduledAt ? 'scheduled' : 'none',
      // Reprogramar desde cero: si había un intento previo fallido, se
      // limpian sus rastros para no arrastrar un error/contenedor viejo a
      // la nueva corrida.
      publish_error: scheduledAt ? null : undefined,
      ig_container_id: scheduledAt ? null : undefined,
      retry_count: scheduledAt ? 0 : undefined,
      tiktok_scheduled_at: tiktokScheduledAt,
      tiktok_publish_status: tiktokScheduledAt ? 'scheduled' : 'none',
      tiktok_publish_error: tiktokScheduledAt ? null : undefined,
      tiktok_container_id: tiktokScheduledAt ? null : undefined,
      tiktok_retry_count: tiktokScheduledAt ? 0 : undefined,
    })
    .eq('id', pieceId)
    .eq('organization_id', activeOrganizationId)

  if (error) {
    return { error: 'No pudimos guardar los cambios. Probá de nuevo.', success: false }
  }

  revalidatePath(`/campaigns/${campaignId}`)
  return { error: null, success: true }
}

/** Saca una pieza de la cola de auto-publicación sin borrarla — vuelve a publish_status='none', mismo estado que si nunca se hubiera programado. */
export async function cancelScheduleAction(pieceId: string, campaignId: string) {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return

  const supabase = await createClient()

  await supabase
    .from('content_piezas')
    .update({ publish_status: 'none', scheduled_at: null, ig_container_id: null, publish_error: null, retry_count: 0 })
    .eq('id', pieceId)
    .eq('organization_id', activeOrganizationId)
    .eq('publish_status', 'scheduled') // no cancela algo que ya está publicando/publicado

  revalidatePath(`/campaigns/${campaignId}`)
}

export async function deletePieceAction(pieceId: string, campaignId: string) {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return
  }

  const supabase = await createClient()

  // Defensa en profundidad (auditoría de cierre, 2026-08-01): la UI ya
  // oculta "Eliminar" mientras publish_status='publishing' — esto cubre el
  // caso de una UI vieja en caché o un llamado directo. Borrar algo en
  // vuelo no cancela la publicación real en Instagram, solo hace que Gotix
  // pierda el registro cuando termine.
  await supabase
    .from('content_piezas')
    .delete()
    .eq('id', pieceId)
    .eq('organization_id', activeOrganizationId)
    .neq('publish_status', 'publishing')

  revalidatePath(`/campaigns/${campaignId}`)
  revalidatePath('/content')
}

export async function deleteCampaignAction(campaignId: string) {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return
  }

  const supabase = await createClient()

  // Primero las piezas: no asumir ON DELETE CASCADE en la FK. Borrar filas
  // que ya no existen es un no-op, así que esto es seguro de todos modos.
  await supabase
    .from('content_piezas')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('organization_id', activeOrganizationId)

  await supabase
    .from('content_campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('organization_id', activeOrganizationId)

  redirect('/campaigns')
}
