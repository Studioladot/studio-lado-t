'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import type { Json } from '@/lib/types/database.types'

export type CrossPostResult = { ok: true; newPostId: string } | { ok: false; error: string }

/**
 * "Resubir a [Otra Plataforma]" (Épica Omnicanal, 2026-08-04) — clona el
 * Archivo Final YA subido del ítem origen (mismo media_url/media_type/
 * media_urls, no se re-sube nada) en una publicación suelta nueva, con el
 * copy de la red destino pre-cargado desde el que ya tenía el origen (si
 * lo tenía). El usuario termina de ajustar copy/horario en el form de
 * edición del post nuevo antes de guardarlo — esta acción solo crea el
 * borrador, listo en 'listo_para_programar'.
 */
export async function crossPostAction(
  sourceTable: 'content_piezas' | 'content_posts',
  sourceId: string,
  targetPlatform: 'instagram' | 'tiktok'
): Promise<CrossPostResult> {
  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()

  let title: string
  let igCaption: string | null
  let tiktokCaption: string | null
  let mediaUrl: string | null
  let mediaType: string | null
  let mediaUrls: Json
  let format: string | null

  if (sourceTable === 'content_piezas') {
    const { data, error } = await supabase
      .from('content_piezas')
      .select('titulo, caption, tiktok_caption, media_url, media_type, media_urls, formato')
      .eq('id', sourceId)
      .eq('organization_id', activeOrganizationId)
      .maybeSingle()
    if (error || !data) return { ok: false, error: 'No encontramos la publicación de origen.' }
    title = data.titulo
    igCaption = data.caption
    tiktokCaption = data.tiktok_caption
    mediaUrl = data.media_url
    mediaType = data.media_type
    mediaUrls = data.media_urls
    format = data.formato
  } else {
    const { data, error } = await supabase
      .from('content_posts')
      .select('title, caption, tiktok_caption, media_url, media_type, media_urls, format')
      .eq('id', sourceId)
      .eq('organization_id', activeOrganizationId)
      .maybeSingle()
    if (error || !data) return { ok: false, error: 'No encontramos la publicación de origen.' }
    title = data.title ?? 'Sin título'
    igCaption = data.caption
    tiktokCaption = data.tiktok_caption
    mediaUrl = data.media_url
    mediaType = data.media_type
    mediaUrls = data.media_urls
    format = data.format
  }

  if (!mediaUrl) {
    return { ok: false, error: 'La publicación de origen no tiene un Archivo Final para reusar.' }
  }

  // Copy de la red destino si ya tenía uno propio; si no, reusa el de la
  // otra red como punto de partida (mejor un borrador editable que uno
  // vacío) — nunca se publica sin que el usuario lo revise primero.
  const prefillCaption = targetPlatform === 'tiktok' ? (tiktokCaption ?? igCaption) : (igCaption ?? tiktokCaption)

  const { data: inserted, error: insertError } = await supabase
    .from('content_posts')
    .insert({
      organization_id: activeOrganizationId,
      user_id: userId,
      title: `${title} (Resubido)`,
      caption: targetPlatform === 'instagram' ? prefillCaption : null,
      tiktok_caption: targetPlatform === 'tiktok' ? prefillCaption : null,
      platform: targetPlatform === 'tiktok' ? 'TikTok' : 'Instagram',
      format: format ?? 'Reel',
      turno: 'Temprano',
      status: 'pendiente',
      production_status: 'listo_para_programar',
      media_url: mediaUrl,
      media_type: mediaType,
      media_urls: mediaUrls,
    })
    .select('id')
    .single()

  if (insertError || !inserted) return { ok: false, error: 'No pudimos crear la republicación. Probá de nuevo.' }

  revalidatePath('/content')
  return { ok: true, newPostId: inserted.id }
}
