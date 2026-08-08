'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { validateMediaFile } from '@/lib/media/validate-upload'
import { clamp, TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'
import { NOTE_COLORS, NOTE_CATEGORY_VALUES } from './note-constants'
import type { Database } from '@/lib/types/database.types'

type NoteUpdate = Database['public']['Tables']['notes']['Update']

export type NoteState = {
  error: string | null
  success: boolean
}

// Bucket "piezas-media" (público), mismo helper de subida que Campañas —
// path {user_id}/{timestamp}-{random}.{ext}.
async function uploadNoteMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const validation = await validateMediaFile(file)
  if (!validation.ok) {
    return { url: null, error: validation.error }
  }
  // Notas solo ofrece adjuntar imagen en su UI (accept="image/*") — la
  // validación del servidor tiene que coincidir con esa promesa, no solo
  // aceptar cualquier tipo de media que el helper compartido reconozca.
  if (validation.kind !== 'image') {
    return { url: null, error: `"${file.name}" no es una imagen — las notas solo admiten adjuntar imágenes.` }
  }

  const ext = file.name.split('.').pop() || 'bin'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: uploadError } = await supabase.storage.from('piezas-media').upload(path, file)

  if (uploadError) {
    return { url: null, error: 'No pudimos subir la imagen. Probá de nuevo.' }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('piezas-media').getPublicUrl(path)

  return { url: publicUrl, error: null }
}

export async function createNoteAction(
  _prevState: NoteState,
  formData: FormData
): Promise<NoteState> {
  const contenido = clamp(String(formData.get('contenido') ?? '').trim(), TEXT_MAX_LENGTH)

  if (!contenido) {
    return { error: 'Escribí algo en la nota.', success: false }
  }

  const { userId, activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.', success: false }
  }

  const titulo = clamp(String(formData.get('titulo') ?? '').trim(), TITLE_MAX_LENGTH)
  const categoria = NOTE_CATEGORY_VALUES.includes(String(formData.get('categoria')))
    ? String(formData.get('categoria'))
    : 'varios'
  const color = NOTE_COLORS.includes(String(formData.get('color')))
    ? String(formData.get('color'))
    : NOTE_COLORS[0]
  // Opcional (killer feature de cierre de Fase 1, 2026-08-06) — atar una
  // nota a una campaña real. String vacío (nota general, no viene de
  // campaigns/[id]/) se guarda como null, nunca como "".
  const campaignId = String(formData.get('campaign_id') ?? '').trim() || null
  // "Pilares Estratégicos" — arquitectura global (2026-08-07): toda nota
  // nueva ya puede nacer atada a un pilar, mismo criterio que Publicaciones
  // y Campañas.
  const pilar = String(formData.get('pilar') ?? '').trim() || null

  const supabase = await createClient()

  let mediaUrl: string | null = null
  const file = formData.get('media') as File | null
  if (file && file.size > 0) {
    const uploaded = await uploadNoteMedia(supabase, userId, file)
    if (uploaded.error) {
      return { error: uploaded.error, success: false }
    }
    mediaUrl = uploaded.url
  }

  const { error } = await supabase.from('notes').insert({
    organization_id: activeOrganizationId,
    user_id: userId,
    titulo: titulo || null,
    contenido,
    categoria,
    color,
    media_url: mediaUrl,
    campaign_id: campaignId,
    pilar,
  })

  if (error) {
    return { error: 'No pudimos guardar la nota. Probá de nuevo.', success: false }
  }

  revalidatePath('/notes')
  if (campaignId) revalidatePath(`/campaigns/${campaignId}`)
  return { error: null, success: true }
}

export async function updateNoteAction(
  noteId: string,
  _prevState: NoteState,
  formData: FormData
): Promise<NoteState> {
  const contenido = clamp(String(formData.get('contenido') ?? '').trim(), TEXT_MAX_LENGTH)

  if (!contenido) {
    return { error: 'Escribí algo en la nota.', success: false }
  }

  const { userId, activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.', success: false }
  }

  const titulo = clamp(String(formData.get('titulo') ?? '').trim(), TITLE_MAX_LENGTH)
  const categoria = NOTE_CATEGORY_VALUES.includes(String(formData.get('categoria')))
    ? String(formData.get('categoria'))
    : 'varios'
  const color = NOTE_COLORS.includes(String(formData.get('color')))
    ? String(formData.get('color'))
    : NOTE_COLORS[0]
  const removeMedia = formData.get('remove_media') === 'true'
  // Solo para saber qué path revalidar — el campaign_id de una nota no se
  // reasigna al editar, viaja acá de solo lectura (ver note-form.tsx).
  const campaignId = String(formData.get('campaign_id') ?? '').trim() || null
  const pilar = String(formData.get('pilar') ?? '').trim() || null

  const supabase = await createClient()

  const update: NoteUpdate = {
    titulo: titulo || null,
    contenido,
    categoria,
    color,
    pilar,
  }

  const file = formData.get('media') as File | null
  if (file && file.size > 0) {
    const uploaded = await uploadNoteMedia(supabase, userId, file)
    if (uploaded.error) {
      return { error: uploaded.error, success: false }
    }
    update.media_url = uploaded.url
  } else if (removeMedia) {
    update.media_url = null
  }

  const { error } = await supabase
    .from('notes')
    .update(update)
    .eq('id', noteId)
    .eq('organization_id', activeOrganizationId)

  if (error) {
    return { error: 'No pudimos guardar los cambios. Probá de nuevo.', success: false }
  }

  revalidatePath('/notes')
  if (campaignId) revalidatePath(`/campaigns/${campaignId}`)
  return { error: null, success: true }
}

export async function deleteNoteAction(noteId: string, campaignId: string | null) {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return
  }

  const supabase = await createClient()

  await supabase.from('notes').delete().eq('id', noteId).eq('organization_id', activeOrganizationId)

  revalidatePath('/notes')
  if (campaignId) revalidatePath(`/campaigns/${campaignId}`)
}
