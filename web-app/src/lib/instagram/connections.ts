import type { SupabaseClient } from '@supabase/supabase-js'

// Mismo patrón delete-then-insert que saveMetaConnection
// (src/lib/meta/connections.ts) — una sola cuenta de Instagram conectada
// por organización (unique(organization_id) en la migración), reconectar
// reemplaza en vez de acumular filas viejas.

export async function saveInstagramConnection(
  supabase: SupabaseClient,
  params: {
    organizationId: string
    pageId: string
    pageName: string
    igUserId: string
    igUsername: string | null
    profilePictureUrl: string | null
    pageAccessToken: string
    fbUserId: string | null
  }
) {
  await supabase.from('instagram_connections').delete().eq('organization_id', params.organizationId)

  const { error } = await supabase.from('instagram_connections').insert({
    organization_id: params.organizationId,
    page_id: params.pageId,
    page_name: params.pageName,
    ig_user_id: params.igUserId,
    ig_username: params.igUsername,
    profile_picture_url: params.profilePictureUrl,
    page_access_token: params.pageAccessToken,
    fb_user_id: params.fbUserId,
  })

  return !error
}
