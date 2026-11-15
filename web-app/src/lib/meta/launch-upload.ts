import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'

// Compartido por /api/meta/upload-video, upload-image y video-status: conexión
// de Meta de la cuenta activa + link público del archivo que el navegador ya
// subió al almacenamiento (bucket "piezas-media", carpeta del usuario).

export type LaunchUploadContext =
  | { ok: true; token: string; accountId: string; userId: string; publicUrl: (path: string) => string | null }
  | { ok: false; error: string; status: number }

export async function getLaunchUploadContext(): Promise<LaunchUploadContext> {
  const { activeOrganizationId, userId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu cuenta activa.', status: 400 }

  const supabase = await createClient()
  const { data: connection } = await supabase
    .from('meta_connections')
    .select('token, account_id, expires_at')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  if (!connection || (connection.expires_at && new Date(connection.expires_at) < new Date())) {
    return { ok: false, error: 'Meta Ads no está conectado.', status: 400 }
  }

  return {
    ok: true,
    token: connection.token,
    accountId: connection.account_id,
    userId,
    // Solo archivos de la carpeta del propio usuario (la que firma getSignedUploadTarget).
    publicUrl: (path: string) =>
      path.startsWith(`${userId}/`) && !path.includes('..') ? supabase.storage.from('piezas-media').getPublicUrl(path).data.publicUrl : null,
  }
}
