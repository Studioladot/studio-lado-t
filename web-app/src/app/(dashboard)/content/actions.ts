'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
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

  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.', success: false }
  }

  const supabase = await createClient()

  // Referencias — multi-archivo, moodboard/tomas crudas para planificación.
  // Gotix no sube nada a Instagram/TikTok directamente (decisión de
  // producto, 2026-08-05): la pieza final se publica desde la app nativa.
  const referenceFiles = formData.getAll('reference').filter((f): f is File => f instanceof File && f.size > 0)
  let referenceMedia: MediaItem[] = []
  if (referenceFiles.length) {
    const uploaded = await uploadPostMediaFiles(supabase, userId, referenceFiles)
    if (uploaded.error) return { error: uploaded.error, success: false }
    referenceMedia = uploaded.media
  }

  const { error } = await supabase.from('content_posts').insert({
    ...built.record,
    organization_id: activeOrganizationId,
    user_id: userId,
    reference_urls: referenceMedia,
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

  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.', success: false }
  }

  const supabase = await createClient()

  const referenceFiles = formData.getAll('reference').filter((f): f is File => f instanceof File && f.size > 0)
  let newReferenceMedia: MediaItem[] = []
  if (referenceFiles.length) {
    const uploaded = await uploadPostMediaFiles(supabase, userId, referenceFiles)
    if (uploaded.error) return { error: uploaded.error, success: false }
    newReferenceMedia = uploaded.media
  }

  const { data: existing } = await supabase
    .from('content_posts')
    .select('reference_urls')
    .eq('id', postId)
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  const existingReferenceMedia = Array.isArray(existing?.reference_urls) ? (existing.reference_urls as unknown as MediaItem[]) : []
  const referenceMedia = [...existingReferenceMedia, ...newReferenceMedia]

  const { error } = await supabase
    .from('content_posts')
    .update({
      ...built.record,
      reference_urls: referenceMedia,
    })
    .eq('id', postId)
    .eq('organization_id', activeOrganizationId)

  if (error) return { error: 'No pudimos guardar los cambios. Probá de nuevo.', success: false }

  revalidatePath('/content')
  return { error: null, success: true }
}

/**
 * Arrastrar una pill de un día a otro en el Calendario — mueve la fecha de
 * planificación (fecha_planificada/date) del ítem, sea pieza o publicación
 * suelta.
 */
export async function rescheduleItemDateAction(sourceTable: 'content_piezas' | 'content_posts', id: string, newDate: string) {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return

  const supabase = await createClient()

  if (sourceTable === 'content_piezas') {
    await supabase
      .from('content_piezas')
      .update({ fecha_planificada: newDate })
      .eq('id', id)
      .eq('organization_id', activeOrganizationId)
  } else {
    await supabase
      .from('content_posts')
      .update({ date: newDate })
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
  await supabase.from('content_posts').delete().eq('id', postId).eq('organization_id', activeOrganizationId)

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
