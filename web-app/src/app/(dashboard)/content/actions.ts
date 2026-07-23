'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'

type MediaItem = { url: string; type: 'image' | 'video' }

// Bucket "piezas-media" (público) — mismo helper de subida que Campañas y Notas.
async function uploadPostMediaFiles(
  supabase: SupabaseClient,
  userId: string,
  files: File[]
): Promise<{ media: MediaItem[]; error: string | null }> {
  const media: MediaItem[] = []

  for (const file of files) {
    const isVideo = file.type.startsWith('video/')
    const ext = file.name.split('.').pop() || 'bin'
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error: uploadError } = await supabase.storage.from('piezas-media').upload(path, file)

    if (uploadError) {
      return { media, error: `No pudimos subir "${file.name}". Probá de nuevo.` }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('piezas-media').getPublicUrl(path)

    media.push({ url: publicUrl, type: isVideo ? 'video' : 'image' })
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

type BuiltPost =
  | { ok: false; error: string }
  | {
      ok: true
      record: {
        title: string
        caption: string | null
        platform: string
        format: string
        date: string | null
        turno: string
        status: string
        protagonista: string | null
      }
    }

async function buildPostRecord(formData: FormData): Promise<BuiltPost> {
  const titulo = String(formData.get('title') ?? '').trim()

  if (!titulo) {
    return { ok: false, error: 'Agregá un título a la publicación.' }
  }

  return {
    ok: true,
    record: {
      title: titulo,
      caption: emptyToNull(formData.get('caption')),
      platform: String(formData.get('platform') ?? 'Instagram'),
      format: String(formData.get('format') ?? 'Reel'),
      date: emptyToNull(formData.get('date')),
      turno: String(formData.get('turno') ?? 'Temprano'),
      status: String(formData.get('status') ?? 'pendiente'),
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

  const files = formData.getAll('media').filter((f): f is File => f instanceof File && f.size > 0)
  let media: MediaItem[] = []
  if (files.length) {
    const uploaded = await uploadPostMediaFiles(supabase, userId, files)
    if (uploaded.error) return { error: uploaded.error, success: false }
    media = uploaded.media
  }

  const { error } = await supabase.from('content_posts').insert({
    ...built.record,
    organization_id: activeOrganizationId,
    user_id: userId,
    media_urls: media,
    media_url: media[0]?.url ?? null,
    media_type: media[0]?.type ?? null,
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

  const files = formData.getAll('media').filter((f): f is File => f instanceof File && f.size > 0)
  let newMedia: MediaItem[] = []
  if (files.length) {
    const uploaded = await uploadPostMediaFiles(supabase, userId, files)
    if (uploaded.error) return { error: uploaded.error, success: false }
    newMedia = uploaded.media
  }

  const { data: existing } = await supabase
    .from('content_posts')
    .select('media_urls')
    .eq('id', postId)
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  const existingMedia = Array.isArray(existing?.media_urls) ? (existing.media_urls as unknown as MediaItem[]) : []
  const media = [...existingMedia, ...newMedia]

  const { error } = await supabase
    .from('content_posts')
    .update({
      ...built.record,
      media_urls: media,
      media_url: media[0]?.url ?? null,
      media_type: media[0]?.type ?? null,
    })
    .eq('id', postId)
    .eq('organization_id', activeOrganizationId)

  if (error) return { error: 'No pudimos guardar los cambios. Probá de nuevo.', success: false }

  revalidatePath('/content')
  return { error: null, success: true }
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
