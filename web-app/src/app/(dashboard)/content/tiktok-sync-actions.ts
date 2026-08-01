'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getAllTiktokVideos, ensureValidTiktokAccessToken } from '@/lib/tiktok/videos'

export type SyncTiktokResult = { ok: true; count: number } | { ok: false; error: string }

/**
 * Sync manual (botón "Sincronizar ahora" en la UI) — no hay una Edge
 * Function con cron todavía, mismo motivo de siempre: no tengo forma de
 * desplegarla yo mismo. Esto ya deja andando el historial real hoy; una
 * vez validado, automatizarlo con un cron (mismo patrón que
 * instagram-metrics-sync) es un paso natural siguiente, no un bloqueante.
 */
export async function syncTiktokVideosAction(): Promise<SyncTiktokResult> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const { data: connection } = await supabase
    .from('tiktok_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  if (!connection) return { ok: false, error: 'TikTok no está conectado.' }

  const tokenResult = await ensureValidTiktokAccessToken(supabase, activeOrganizationId, connection)
  if (!tokenResult.ok) return tokenResult

  const videosResult = await getAllTiktokVideos(tokenResult.accessToken)
  if (!videosResult.ok) return videosResult

  if (videosResult.videos.length === 0) return { ok: true, count: 0 }

  const now = new Date().toISOString()
  const rows = videosResult.videos.map((v) => ({
    organization_id: activeOrganizationId,
    tiktok_video_id: v.id,
    description: v.video_description ?? null,
    cover_image_url: v.cover_image_url ?? null,
    share_url: v.share_url ?? null,
    duration_seconds: v.duration ?? null,
    posted_at: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
    view_count: v.view_count ?? 0,
    like_count: v.like_count ?? 0,
    comment_count: v.comment_count ?? 0,
    share_count: v.share_count ?? 0,
    synced_at: now,
  }))

  const { error } = await supabase.from('tiktok_videos').upsert(rows, { onConflict: 'organization_id,tiktok_video_id' })
  // Detalle técnico solo en el log del servidor — el usuario final nunca
  // debe ver mensajes de Postgres/Supabase (regla fija, 2026-08-01).
  if (error) {
    console.error('[syncTiktokVideosAction] upsert falló:', error.message)
    return { ok: false, error: 'No pudimos guardar tus videos. Probá de nuevo en unos minutos.' }
  }

  revalidatePath('/content')
  return { ok: true, count: rows.length }
}
