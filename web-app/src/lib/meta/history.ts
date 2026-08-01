import type { SupabaseClient } from '@supabase/supabase-js'

// Historial de Actividad — NO es un changelog general de campañas (eso no
// existe en el legado tampoco). Es el log de intentos de lanzamiento del
// wizard "Lanzar Testeo" — cada corrida de launchTestCampaignAction
// (campaigns/actions.ts) escribe una fila acá, éxito o fracaso, con el
// detalle paso a paso que ya se arma para el modal del wizard.

export type LaunchLogStatus = 'completed' | 'completed_with_errors' | 'failed'
export type LaunchLogStep = { label: string; ok: boolean; detail?: string }

export type LaunchActivityEntry = {
  id: string
  campaignId: string | null
  campaignName: string
  status: LaunchLogStatus
  steps: LaunchLogStep[]
  createdAt: string
}

export async function insertLaunchActivityLog(
  supabase: SupabaseClient,
  params: {
    organizationId: string
    userId: string
    campaignId: string | null
    campaignName: string
    status: LaunchLogStatus
    steps: LaunchLogStep[]
  }
): Promise<void> {
  await supabase.from('launch_activity_log').insert({
    organization_id: params.organizationId,
    campaign_id: params.campaignId,
    campaign_name: params.campaignName,
    status: params.status,
    steps: params.steps,
    created_by: params.userId,
  })
}

export async function getLaunchActivityLog(
  supabase: SupabaseClient,
  organizationId: string,
  limit = 50
): Promise<LaunchActivityEntry[]> {
  const { data } = await supabase
    .from('launch_activity_log')
    .select('id, campaign_id, campaign_name, status, steps, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((row) => ({
    id: row.id,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    status: row.status as LaunchLogStatus,
    steps: (row.steps ?? []) as LaunchLogStep[],
    createdAt: row.created_at,
  }))
}
