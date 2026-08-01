'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { parseScheduledAt } from '@/lib/instagram/scheduling'
import { validateMediaFile } from '@/lib/media/validate-upload'

type MediaItem = { url: string; type: 'image' | 'video' }

// Bucket "piezas-media" (público) — mismo helper de subida que Campañas y Notas.
async function uploadPostMediaFiles(
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

export type PostState = {
  error: string | null
  success: boolean
}

const emptyToNull = (value: FormDataEntryValue | null) => {
  const str = typeof value === 'string' ? value.trim() : ''
  return str || null
}

const PRODUCTION_STATUSES = ['idea', 'por_grabar', 'listo_para_programar', 'programado', 'publicado']

type BuiltPost =
  | { ok: false; error: string }
  | {
      ok: true
      record: {
        title: string
        caption: string | null
        tiktok_caption: string | null
        platform: string
        format: string
        date: string | null
        turno: string
        status: string
        production_status: string
        protagonista: string | null
      }
    }

async function buildPostRecord(formData: FormData): Promise<BuiltPost> {
  const titulo = String(formData.get('title') ?? '').trim()

  if (!titulo) {
    return { ok: false, error: 'Agregá un título a la publicación.' }
  }

  const productionStatus = String(formData.get('production_status') ?? 'idea')

  return {
    ok: true,
    record: {
      title: titulo,
      caption: emptyToNull(formData.get('caption')),
      tiktok_caption: emptyToNull(formData.get('tiktok_caption')),
      platform: String(formData.get('platform') ?? 'Instagram'),
      format: String(formData.get('format') ?? 'Reel'),
      date: emptyToNull(formData.get('date')),
      turno: String(formData.get('turno') ?? 'Temprano'),
      status: String(formData.get('status') ?? 'pendiente'),
      production_status: PRODUCTION_STATUSES.includes(productionStatus) ? productionStatus : 'idea',
      protagonista: emptyToNull(formData.get('protagonista')),
    },
  }
}

export async function createPostAction(_prevState: PostState, formData: FormData): Promise<PostState> {
  const built = await buildPostRecord(formData)
  if (!built.ok) return { error: built.error, success: false }

  const { iso: scheduledAt, error: scheduleError } = parseScheduledAt(formData)
  if (scheduleError) return { error: scheduleError, success: false }

  const { iso: tiktokScheduledAt, error: tiktokScheduleError } = parseScheduledAt(formData, 'tiktok_')
  if (tiktokScheduleError) return { error: tiktokScheduleError, success: false }

  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.', success: false }
  }

  const supabase = await createClient()

  // Archivo Final — un solo archivo (Épica Omnicanal, 2026-08-04): el input
  // ya no tiene `multiple` en la UI, pero por las dudas se toma solo el
  // primero si llegara más de uno.
  const finalFiles = formData.getAll('media').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 1)
  let media: MediaItem[] = []
  if (finalFiles.length) {
    const uploaded = await uploadPostMediaFiles(supabase, userId, finalFiles)
    if (uploaded.error) return { error: uploaded.error, success: false }
    media = uploaded.media
  }

  // Referencias — multi-archivo, moodboard/tomas crudas. Nunca las lee el
  // pipeline de publicación (solo media_url/media_urls).
  const referenceFiles = formData.getAll('reference').filter((f): f is File => f instanceof File && f.size > 0)
  let referenceMedia: MediaItem[] = []
  if (referenceFiles.length) {
    const uploaded = await uploadPostMediaFiles(supabase, userId, referenceFiles)
    if (uploaded.error) return { error: uploaded.error, success: false }
    referenceMedia = uploaded.media
  }

  if (scheduledAt && media.length === 0) {
    return { error: 'Para programar la auto-publicación, subí el Archivo Final que se va a publicar.', success: false }
  }

  const { error } = await supabase.from('content_posts').insert({
    ...built.record,
    organization_id: activeOrganizationId,
    user_id: userId,
    media_urls: media,
    media_url: media[0]?.url ?? null,
    media_type: media[0]?.type ?? null,
    reference_urls: referenceMedia,
    scheduled_at: scheduledAt,
    publish_status: scheduledAt ? 'scheduled' : 'none',
    tiktok_scheduled_at: tiktokScheduledAt,
    tiktok_publish_status: tiktokScheduledAt ? 'scheduled' : 'none',
  })

  if (error) return { error: 'No pudimos guardar la publicación. Probá de nuevo.', success: false }

  revalidatePath('/content')
  return { error: null, success: true }
}

export async function updatePostAction(
  postId: string,
  _prevState: PostState,
  formData: FormData
): Promise<PostState> {
  const built = await buildPostRecord(formData)
  if (!built.ok) return { error: built.error, success: false }

  const { iso: scheduledAt, error: scheduleError } = parseScheduledAt(formData)
  if (scheduleError) return { error: scheduleError, success: false }

  const { iso: tiktokScheduledAt, error: tiktokScheduleError } = parseScheduledAt(formData, 'tiktok_')
  if (tiktokScheduleError) return { error: tiktokScheduleError, success: false }

  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.', success: false }
  }

  const supabase = await createClient()

  const finalFiles = formData.getAll('media').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 1)
  let newMedia: MediaItem[] = []
  if (finalFiles.length) {
    const uploaded = await uploadPostMediaFiles(supabase, userId, finalFiles)
    if (uploaded.error) return { error: uploaded.error, success: false }
    newMedia = uploaded.media
  }

  const referenceFiles = formData.getAll('reference').filter((f): f is File => f instanceof File && f.size > 0)
  let newReferenceMedia: MediaItem[] = []
  if (referenceFiles.length) {
    const uploaded = await uploadPostMediaFiles(supabase, userId, referenceFiles)
    if (uploaded.error) return { error: uploaded.error, success: false }
    newReferenceMedia = uploaded.media
  }

  const { data: existing } = await supabase
    .from('content_posts')
    .select('media_urls, reference_urls, publish_status')
    .eq('id', postId)
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  if (scheduledAt && (existing?.publish_status === 'publishing' || existing?.publish_status === 'published')) {
    return { error: 'Esta publicación ya se está publicando o ya se publicó — no se puede reprogramar.', success: false }
  }

  // Archivo Final: un solo archivo — si se sube uno nuevo, REEMPLAZA al
  // anterior (no se acumula, a diferencia de Referencias, que sí es un
  // álbum). Sin archivo nuevo, se conserva el que ya había.
  const existingMedia = Array.isArray(existing?.media_urls) ? (existing.media_urls as unknown as MediaItem[]) : []
  const media = newMedia.length > 0 ? newMedia : existingMedia

  const existingReferenceMedia = Array.isArray(existing?.reference_urls) ? (existing.reference_urls as unknown as MediaItem[]) : []
  const referenceMedia = [...existingReferenceMedia, ...newReferenceMedia]

  if (scheduledAt && media.length === 0) {
    return { error: 'Para programar la auto-publicación, primero subí el Archivo Final que se va a publicar.', success: false }
  }

  const { error } = await supabase
    .from('content_posts')
    .update({
      ...built.record,
      media_urls: media,
      media_url: media[0]?.url ?? null,
      media_type: media[0]?.type ?? null,
      reference_urls: referenceMedia,
      scheduled_at: scheduledAt,
      publish_status: scheduledAt ? 'scheduled' : 'none',
      publish_error: scheduledAt ? null : undefined,
      ig_container_id: scheduledAt ? null : undefined,
      retry_count: scheduledAt ? 0 : undefined,
      tiktok_scheduled_at: tiktokScheduledAt,
      tiktok_publish_status: tiktokScheduledAt ? 'scheduled' : 'none',
      tiktok_publish_error: tiktokScheduledAt ? null : undefined,
      tiktok_container_id: tiktokScheduledAt ? null : undefined,
      tiktok_retry_count: tiktokScheduledAt ? 0 : undefined,
    })
    .eq('id', postId)
    .eq('organization_id', activeOrganizationId)

  if (error) return { error: 'No pudimos guardar los cambios. Probá de nuevo.', success: false }

  revalidatePath('/content')
  return { error: null, success: true }
}

/** Saca una publicación suelta de la cola de auto-publicación — mismo criterio que cancelScheduleAction de piezas. */
export async function cancelPostScheduleAction(postId: string) {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return

  const supabase = await createClient()

  await supabase
    .from('content_posts')
    .update({ publish_status: 'none', scheduled_at: null, ig_container_id: null, publish_error: null, retry_count: 0 })
    .eq('id', postId)
    .eq('organization_id', activeOrganizationId)
    .eq('publish_status', 'scheduled')

  revalidatePath('/content')
}

/**
 * Arrastrar una pill de un día a otro en el Calendario — mueve la fecha de
 * planificación (fecha_planificada/date) del ítem, sea pieza o publicación
 * suelta. Si tenía auto-publicación activa (scheduled_at), la hora del día
 * se preserva — arrastrar cambia el día, nunca la hora, salvo que el
 * usuario la edite a mano.
 */
export async function rescheduleItemDateAction(sourceTable: 'content_piezas' | 'content_posts', id: string, newDate: string) {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from(sourceTable)
    .select('scheduled_at')
    .eq('id', id)
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  let shiftedScheduledAt: string | null = null
  if (existing?.scheduled_at) {
    const prev = new Date(existing.scheduled_at)
    const [year, month, day] = newDate.split('-').map(Number)
    const shifted = new Date(prev)
    shifted.setFullYear(year, month - 1, day)
    shiftedScheduledAt = shifted.toISOString()
  }

  if (sourceTable === 'content_piezas') {
    await supabase
      .from('content_piezas')
      .update({ fecha_planificada: newDate, ...(shiftedScheduledAt ? { scheduled_at: shiftedScheduledAt } : {}) })
      .eq('id', id)
      .eq('organization_id', activeOrganizationId)
  } else {
    await supabase
      .from('content_posts')
      .update({ date: newDate, ...(shiftedScheduledAt ? { scheduled_at: shiftedScheduledAt } : {}) })
      .eq('id', id)
      .eq('organization_id', activeOrganizationId)
  }

  revalidatePath('/content')
  revalidatePath('/campaigns')
}

export async function deletePostAction(postId: string) {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return

  const supabase = await createClient()
  // Defensa en profundidad (auditoría de cierre, 2026-08-01): la UI ya
  // oculta "Borrar" mientras publish_status='publishing', pero esto cubre
  // el caso de una UI vieja en caché o un llamado directo — borrar algo en
  // vuelo no cancela la publicación real en Instagram, solo hace que Gotix
  // pierda el registro cuando termine.
  await supabase.from('content_posts').delete().eq('id', postId).eq('organization_id', activeOrganizationId).neq('publish_status', 'publishing')

  revalidatePath('/content')
}

export async function togglePostStatusAction(postId: string, nextStatus: string) {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return

  const supabase = await createClient()
  await supabase
    .from('content_posts')
    .update({ status: nextStatus })
    .eq('id', postId)
    .eq('organization_id', activeOrganizationId)

  revalidatePath('/content')
}
