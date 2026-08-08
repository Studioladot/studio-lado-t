import type { SupabaseClient } from '@supabase/supabase-js'

// "Pilares Estratégicos" en Campañas de Meta Ads (2026-08-07) — las
// campañas viven solo en Meta (identificadas por su campaign_id, texto),
// no hay una fila local por campaña. campaign_pillars ata la asignación a
// ese id, org-scoped — mismo patrón que campaign_targets/ad_creative_origins.

/** Bulk — para la lista de Campañas, una sola query en vez de una por fila. */
export async function getCampaignPillars(
  supabase: SupabaseClient,
  organizationId: string,
  campaignIds: string[]
): Promise<Record<string, string>> {
  if (campaignIds.length === 0) return {}
  const { data } = await supabase
    .from('campaign_pillars')
    .select('campaign_id, pillar')
    .eq('organization_id', organizationId)
    .in('campaign_id', campaignIds)

  return Object.fromEntries((data ?? []).map((row) => [row.campaign_id, row.pillar]))
}

/** Una campaña puntual — para el detalle. */
export async function getCampaignPillar(supabase: SupabaseClient, organizationId: string, campaignId: string): Promise<string | null> {
  const { data } = await supabase
    .from('campaign_pillars')
    .select('pillar')
    .eq('organization_id', organizationId)
    .eq('campaign_id', campaignId)
    .maybeSingle()
  return data?.pillar ?? null
}

export async function upsertCampaignPillar(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string,
  pillar: string
): Promise<boolean> {
  const { error } = await supabase
    .from('campaign_pillars')
    .upsert(
      { organization_id: organizationId, campaign_id: campaignId, pillar, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id,campaign_id' }
    )
  return !error
}
