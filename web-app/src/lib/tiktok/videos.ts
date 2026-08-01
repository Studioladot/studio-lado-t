import type { SupabaseClient } from '@supabase/supabase-js'
import { TIKTOK_TOKEN_URL } from './oauth'

// TikTok Display API (video.list) — trae el catálogo completo de videos ya
// publicados en la cuenta conectada, paginado por cursor. NO incluye un
// campo de descarga directa del MP4 para apps de terceros con acceso
// estándar (a diferencia de la Content Posting API, que sí puede publicar
// pero no leer archivos ajenos) — por eso no se pide ni se completa acá,
// ver tiktok_videos.video_download_url en la migración. Si en el futuro
// se consigue acceso elevado con un campo real de descarga, se agrega acá
// sin tocar el resto del pipeline.
const TIKTOK_VIDEO_LIST_URL = 'https://open.tiktokapis.com/v2/video/list/'
const VIDEO_FIELDS = 'id,create_time,cover_image_url,share_url,video_description,duration,view_count,like_count,comment_count,share_count'

export type TiktokVideoListItem = {
  id: string
  create_time: number
  cover_image_url?: string
  share_url?: string
  video_description?: string
  duration?: number
  view_count?: number
  like_count?: number
  comment_count?: number
  share_count?: number
}

type VideoListResult =
  | { ok: true; videos: TiktokVideoListItem[]; cursor: number; hasMore: boolean }
  | { ok: false; error: string }

export async function getTiktokVideoList(accessToken: string, cursor?: number): Promise<VideoListResult> {
  try {
    const res = await fetch(`${TIKTOK_VIDEO_LIST_URL}?fields=${VIDEO_FIELDS}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor } : {}) }),
    })
    const json = await res.json()

    if (json.error && json.error.code !== 'ok') {
      return { ok: false, error: json.error.message || json.error.code || 'Error desconocido de TikTok.' }
    }

    return {
      ok: true,
      videos: json.data?.videos ?? [],
      cursor: json.data?.cursor ?? 0,
      hasMore: json.data?.has_more ?? false,
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red.' }
  }
}

/**
 * Trae TODO el historial paginando por cursor — video.list devuelve como
 * mucho 20 por página. Con un límite duro de 20 páginas (400 videos) para
 * no quedar en un loop si TikTok devolviera has_more=true de forma
 * inconsistente.
 */
export async function getAllTiktokVideos(accessToken: string): Promise<{ ok: true; videos: TiktokVideoListItem[] } | { ok: false; error: string }> {
  const allVideos: TiktokVideoListItem[] = []
  let cursor: number | undefined
  const MAX_PAGES = 20

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await getTiktokVideoList(accessToken, cursor)
    if (!result.ok) return result
    allVideos.push(...result.videos)
    if (!result.hasMore) break
    cursor = result.cursor
  }

  return { ok: true, videos: allVideos }
}

type TiktokConnection = {
  access_token: string
  refresh_token: string
  expires_at: string
}

type EnsureTokenResult = { ok: true; accessToken: string } | { ok: false; error: string }

/**
 * El access_token de TikTok expira (~24hs) — a diferencia del long-lived
 * token de Meta, acá hay que refrescarlo activamente con el refresh_token
 * antes de cada sync si ya venció, y persistir el par nuevo (TikTok rota
 * el refresh_token en cada uso, el viejo deja de servir).
 */
export async function ensureValidTiktokAccessToken(
  supabase: SupabaseClient,
  organizationId: string,
  connection: TiktokConnection
): Promise<EnsureTokenResult> {
  const expiresAt = new Date(connection.expires_at)
  const stillValid = expiresAt.getTime() - Date.now() > 60_000 // 1 min de margen

  if (stillValid) return { ok: true, accessToken: connection.access_token }

  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  if (!clientKey || !clientSecret) return { ok: false, error: 'TikTok no está configurado todavía.' }

  try {
    const res = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
      }),
    })
    const data = await res.json()

    if (data.error) {
      return { ok: false, error: data.error_description || data.error }
    }

    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

    const { error: updateError } = await supabase
      .from('tiktok_connections')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: newExpiresAt,
      })
      .eq('organization_id', organizationId)

    if (updateError) return { ok: false, error: `No pudimos guardar el token renovado: ${updateError.message}` }

    return { ok: true, accessToken: data.access_token }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red al renovar el token.' }
  }
}
