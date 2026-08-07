import type { SupabaseClient } from '@supabase/supabase-js'
import { getMetaAccountAds } from './campaigns'
import { getAllCampaignTargets, resolveCampaignTargets, getStrategicStatus } from './autopilot'

// "Guión Ganador" (2026-08-07) — Feedback Loop de Guiones: qué guiones
// tienen HOY un anuncio en vivo (library_creatives.deployed_ad_id, puesto
// ahí por "Convertir a Anuncio") que está en tier 'escalar' (mismo criterio
// que ya usan StrategicStatusDot/ScaleCampaignButton en Campañas — ningún
// umbral nuevo). Cero fetch a Meta si ningún guion de la lista tiene un
// anuncio desplegado — el corte temprano evita pagar el costo de esta
// función en cuentas que todavía no convirtieron nada.
export async function computeWinnerScriptIds(
  supabase: SupabaseClient,
  organizationId: string,
  scriptIds: string[]
): Promise<Set<string>> {
  if (scriptIds.length === 0) return new Set()

  const { data: links } = await supabase
    .from('library_creatives')
    .select('source_script_id, deployed_ad_id')
    .eq('organization_id', organizationId)
    .in('source_script_id', scriptIds)
    .not('deployed_ad_id', 'is', null)

  const scriptIdByAdId = new Map<string, string>()
  for (const row of links ?? []) {
    if (row.source_script_id && row.deployed_ad_id) scriptIdByAdId.set(row.deployed_ad_id, row.source_script_id)
  }
  if (scriptIdByAdId.size === 0) return new Set()

  const { data: connection } = await supabase
    .from('meta_connections')
    .select('token, account_id')
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (!connection) return new Set()

  const [adsResult, targetsBulk] = await Promise.all([
    getMetaAccountAds(connection.token, connection.account_id, 30),
    getAllCampaignTargets(supabase, organizationId),
  ])
  if (!adsResult.ok) return new Set()

  const winners = new Set<string>()
  for (const ad of adsResult.ads) {
    const scriptId = scriptIdByAdId.get(ad.id)
    if (!scriptId) continue
    const targets = resolveCampaignTargets(ad.campaignId ?? '', targetsBulk)
    if (getStrategicStatus(ad, targets)?.label === 'escalar') winners.add(scriptId)
  }
  return winners
}
