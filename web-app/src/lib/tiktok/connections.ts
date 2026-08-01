import type { SupabaseClient } from '@supabase/supabase-js'

// Mismo patrón delete-then-insert que saveMetaConnection/
// saveInstagramConnection — una sola cuenta de TikTok conectada por
// organización (unique(organization_id) en la migración), reconectar
// reemplaza en vez de acumular filas viejas.

export type SaveTiktokConnectionResult = { ok: true } | { ok: false; error: string }

export async function saveTiktokConnection(
  supabase: SupabaseClient,
  params: {
    organizationId: string
    tiktokOpenId: string
    tiktokUsername: string | null
    avatarUrl: string | null
    accessToken: string
    refreshToken: string
    expiresAt: string
  }
): Promise<SaveTiktokConnectionResult> {
  await supabase.from('tiktok_connections').delete().eq('organization_id', params.organizationId)

  const { error } = await supabase.from('tiktok_connections').insert({
    organization_id: params.organizationId,
    tiktok_open_id: params.tiktokOpenId,
    tiktok_username: params.tiktokUsername,
    avatar_url: params.avatarUrl,
    access_token: params.accessToken,
    refresh_token: params.refreshToken,
    expires_at: params.expiresAt,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
