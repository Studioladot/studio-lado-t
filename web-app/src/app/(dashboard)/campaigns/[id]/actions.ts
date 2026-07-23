'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'

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
}

export async function createPieceAction(
  _prevState: CreatePieceState,
  formData: FormData
): Promise<CreatePieceState> {
  const campaignId = String(formData.get('campaign_id') ?? '')
  const titulo = String(formData.get('titulo') ?? '').trim()

  if (!campaignId) {
    return { error: 'Falta el id de la campaña.' }
  }

  if (!titulo) {
    return { error: 'Ingresá un título para la pieza.' }
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

  const files = formData
    .getAll('media_files')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

  const { media: mediaUrls, error: uploadError } = await uploadPieceMediaFiles(
    supabase,
    user.id,
    files
  )

  if (uploadError) {
    return { error: uploadError }
  }

  const { error } = await supabase.from('content_piezas').insert({
    campaign_id: campaignId,
    titulo,
    formato: emptyToNull(formData.get('formato')),
    plataforma: emptyToNull(formData.get('plataforma')),
    fecha_planificada: emptyToNull(formData.get('fecha_planificada')),
    turno: emptyToNull(formData.get('turno')),
    protagonista: emptyToNull(formData.get('protagonista')),
    notas: emptyToNull(formData.get('notas')),
    status: 'pendiente',
    user_id: user.id,
    organization_id: activeOrganizationId,
    media_urls: mediaUrls.length > 0 ? mediaUrls : null,
    media_url: mediaUrls[0]?.url ?? null,
    media_type: mediaUrls[0]?.type ?? null,
  })

  if (error) {
    return { error: 'No pudimos crear la pieza. Probá de nuevo.' }
  }

  revalidatePath(`/campaigns/${campaignId}`)
  return { error: null }
}

export type AddMediaState = {
  error: string | null
}

export async function addPieceMediaAction(
  pieceId: string,
  campaignId: string,
  _prevState: AddMediaState,
  formData: FormData
): Promise<AddMediaState> {
  const files = formData
    .getAll('media_files')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

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
    .select('media_urls')
    .eq('id', pieceId)
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  if (!existingPiece) {
    return { error: 'No encontramos la pieza.' }
  }

  const { media: newMedia, error: uploadError } = await uploadPieceMediaFiles(
    supabase,
    user.id,
    files
  )

  if (uploadError) {
    return { error: uploadError }
  }

  const existingMedia = Array.isArray(existingPiece.media_urls)
    ? (existingPiece.media_urls as MediaItem[])
    : []
  const mergedMedia = [...existingMedia, ...newMedia]

  const { error } = await supabase
    .from('content_piezas')
    .update({
      media_urls: mergedMedia,
      media_url: mergedMedia[0]?.url ?? null,
      media_type: mergedMedia[0]?.type ?? null,
    })
    .eq('id', pieceId)
    .eq('organization_id', activeOrganizationId)

  if (error) {
    return { error: 'No pudimos guardar los archivos. Probá de nuevo.' }
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
