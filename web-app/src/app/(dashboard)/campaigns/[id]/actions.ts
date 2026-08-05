'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { clamp, TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'

type MediaItem = { url: string; type: 'image' | 'video' }

// El archivo ya se subió del lado del cliente directo a Storage (bug real
// reportado, 2026-08-06: subir el File acá adentro pegaba contra el límite
// de body de ~4.5MB de las funciones serverless de Vercel) — este campo
// solo trae la URL pública ya resuelta, ver src/lib/media/upload-client.ts.
function parseUploadedMedia(formData: FormData, field: string): MediaItem[] {
  const raw = formData.get(field)
  if (typeof raw !== 'string' || !raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is MediaItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as MediaItem).url === 'string' &&
        ((item as MediaItem).type === 'image' || (item as MediaItem).type === 'video')
    )
  } catch {
    return []
  }
}

export type SaveState = {
  error: string | null
  success: boolean
}

const emptyToNull = (value: FormDataEntryValue | null) => {
  const str = typeof value === 'string' ? value.trim() : ''
  return str || null
}

// Hotfix de seguridad (2026-08-06): el maxLength del <input>/<textarea> es
// cosmético — un FormData armado a mano lo saltea. Acá el límite se vuelve
// real: nada llega a la base con más de TITLE_MAX_LENGTH/TEXT_MAX_LENGTH.
const clampTitle = (value: string) => clamp(value, TITLE_MAX_LENGTH)
const clampShortField = (value: FormDataEntryValue | null) => {
  const nulled = emptyToNull(value)
  return nulled ? clampTitle(nulled) : null
}
const clampText = (value: FormDataEntryValue | null) => {
  const nulled = emptyToNull(value)
  return nulled ? clamp(nulled, TEXT_MAX_LENGTH) : null
}

export async function updateCampaignDetailsAction(
  _prevState: SaveState,
  formData: FormData
): Promise<SaveState> {
  const campaignId = String(formData.get('campaign_id') ?? '')
  const nombre = clampTitle(String(formData.get('nombre') ?? '').trim())

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
      objetivo: clampText(formData.get('objetivo')),
      concepto_estrategico: clampText(formData.get('concepto_estrategico')),
      concepto_creativo: clampText(formData.get('concepto_creativo')),
      desarrollo: clampText(formData.get('desarrollo')),
      notas: clampText(formData.get('notas')),
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
  const titulo = clampTitle(String(formData.get('titulo') ?? '').trim())

  if (!campaignId) {
    return { error: 'Falta el id de la campaña.', success: false }
  }

  if (!titulo) {
    return { error: 'Ingresá un título para la pieza.', success: false }
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

  // Referencias — multi-archivo, moodboard/tomas crudas para planificación.
  // El archivo ya se subió del lado del cliente (ver upload-client.ts);
  // acá solo llega la URL pública. Gotix no sube nada a Instagram/TikTok
  // directamente (decisión de producto, 2026-08-05): la pieza final se
  // publica desde la app nativa.
  const referenceUrls = parseUploadedMedia(formData, 'reference_media')

  const productionStatusRaw = String(formData.get('production_status') ?? 'idea')

  const { error } = await supabase.from('content_piezas').insert({
    campaign_id: campaignId,
    titulo,
    formato: emptyToNull(formData.get('formato')),
    plataforma: emptyToNull(formData.get('plataforma')),
    fecha_planificada: emptyToNull(formData.get('fecha_planificada')),
    turno: emptyToNull(formData.get('turno')),
    protagonista: clampShortField(formData.get('protagonista')),
    notas: clampText(formData.get('notas')),
    caption: clampText(formData.get('caption')),
    tiktok_caption: clampText(formData.get('tiktok_caption')),
    status: 'pendiente',
    production_status: PRODUCTION_STATUSES.includes(productionStatusRaw) ? productionStatusRaw : 'idea',
    user_id: user.id,
    organization_id: activeOrganizationId,
    reference_urls: referenceUrls,
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
 * Suma más Referencias a una pieza ya creada — piece-edit-form.tsx no tiene
 * input de archivo propio, esto es lo único que agrega media después de la
 * creación (ver add-piece-media-form.tsx). Se acumula (álbum), nunca
 * reemplaza lo que ya había. El archivo ya se subió del lado del cliente
 * (ver upload-client.ts) — acá solo llegan las URLs públicas a mergear.
 */
export async function addPieceMediaAction(
  pieceId: string,
  campaignId: string,
  _prevState: AddMediaState,
  formData: FormData
): Promise<AddMediaState> {
  const newMedia = parseUploadedMedia(formData, 'reference_media')

  if (newMedia.length === 0) {
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
    .select('reference_urls')
    .eq('id', pieceId)
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  if (!existingPiece) {
    return { error: 'No encontramos la pieza.' }
  }

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
  const titulo = clampTitle(String(formData.get('titulo') ?? '').trim())

  if (!titulo) {
    return { error: 'La pieza necesita un título.', success: false }
  }

  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.', success: false }
  }

  const supabase = await createClient()

  const productionStatusRaw = String(formData.get('production_status') ?? 'idea')

  const { error } = await supabase
    .from('content_piezas')
    .update({
      titulo,
      formato: emptyToNull(formData.get('formato')),
      plataforma: emptyToNull(formData.get('plataforma')),
      fecha_planificada: emptyToNull(formData.get('fecha_planificada')),
      turno: emptyToNull(formData.get('turno')),
      protagonista: clampShortField(formData.get('protagonista')),
      notas: clampText(formData.get('notas')),
      caption: clampText(formData.get('caption')),
      tiktok_caption: clampText(formData.get('tiktok_caption')),
      production_status: PRODUCTION_STATUSES.includes(productionStatusRaw) ? productionStatusRaw : 'idea',
    })
    .eq('id', pieceId)
    .eq('organization_id', activeOrganizationId)

  if (error) {
    return { error: 'No pudimos guardar los cambios. Probá de nuevo.', success: false }
  }

  revalidatePath(`/campaigns/${campaignId}`)
  return { error: null, success: true }
}

export async function deletePieceAction(pieceId: string, campaignId: string) {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return
  }

  const supabase = await createClient()

  await supabase
    .from('content_piezas')
    .delete()
    .eq('id', pieceId)
    .eq('organization_id', activeOrganizationId)

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
