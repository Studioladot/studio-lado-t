'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { clamp, TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'

type MediaItem = { url: string; type: 'image' | 'video' }

// El archivo ya se subió del lado del cliente directo a Storage (bug real
// reportado, 2026-08-06: subirlo acá adentro pegaba contra el límite de
// body de ~4.5MB de las funciones serverless de Vercel) — este campo solo
// trae la URL pública ya resuelta, ver src/lib/media/upload-client.ts.
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

// Hotfix de seguridad (2026-08-06): el maxLength del <input>/<textarea> es
// cosmético — un FormData armado a mano lo saltea sin problema. Acá es
// donde el límite se vuelve real: nada llega a la base con más de
// TITLE_MAX_LENGTH/TEXT_MAX_LENGTH caracteres, lo tipee quien lo tipee.
const clampTitle = (value: string) => clamp(value, TITLE_MAX_LENGTH)
const clampText = (value: FormDataEntryValue | null) => {
  const nulled = emptyToNull(value)
  return nulled ? clamp(nulled, TEXT_MAX_LENGTH) : null
}

async function buildPostRecord(formData: FormData): Promise<BuiltPost> {
  const titulo = clampTitle(String(formData.get('title') ?? '').trim())

  if (!titulo) {
    return { ok: false, error: 'Agregá un título a la publicación.' }
  }

  const productionStatus = String(formData.get('production_status') ?? 'idea')

  return {
    ok: true,
    record: {
      title: titulo,
      caption: clampText(formData.get('caption')),
      tiktok_caption: clampText(formData.get('tiktok_caption')),
      platform: String(formData.get('platform') ?? 'Instagram'),
      format: String(formData.get('format') ?? 'Reel'),
      date: emptyToNull(formData.get('date')),
      turno: String(formData.get('turno') ?? 'Temprano'),
      status: String(formData.get('status') ?? 'pendiente'),
      production_status: PRODUCTION_STATUSES.includes(productionStatus) ? productionStatus : 'idea',
      protagonista: emptyToNull(formData.get('protagonista')) ? clampTitle(String(formData.get('protagonista'))) : null,
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
  // El archivo ya se subió del lado del cliente (ver upload-client.ts);
  // acá solo llega la URL pública. Gotix no sube nada a Instagram/TikTok
  // directamente (decisión de producto, 2026-08-05): la pieza final se
  // publica desde la app nativa.
  const referenceMedia = parseUploadedMedia(formData, 'reference_media')

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

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.', success: false }
  }

  const supabase = await createClient()

  const newReferenceMedia = parseUploadedMedia(formData, 'reference_media')

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
