'use server'

import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import {
  getMetaCampaignAdSets,
  getMetaCampaignAds,
  getMetaEntityDailyInsights,
  type MetaEntityDailyInsightsResult,
} from '@/lib/meta/campaigns'

async function getMetaToken(activeOrganizationId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('meta_connections')
    .select('token')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()
  return data?.token ?? null
}

export type SnapshotEntityOption = { id: string; name: string }
export type SnapshotEntitiesResult = { ok: true; entities: SnapshotEntityOption[] } | { ok: false; error: string }

/** Lista conjuntos o anuncios de UNA campaña para el selector — reusa getMetaCampaignAdSets/getMetaCampaignAds (traen más métricas de las que hacen falta acá, pero evita duplicar el fetch). */
export async function listSnapshotEntitiesAction(campaignId: string, level: 'adset' | 'ad'): Promise<SnapshotEntitiesResult> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const token = await getMetaToken(activeOrganizationId)
  if (!token) return { ok: false, error: 'Conectá Meta Ads primero.' }

  if (level === 'adset') {
    const result = await getMetaCampaignAdSets(token, campaignId)
    if (!result.ok) return result
    return { ok: true, entities: result.adSets.map((a) => ({ id: a.id, name: a.name })) }
  }

  const result = await getMetaCampaignAds(token, campaignId)
  if (!result.ok) return result
  return { ok: true, entities: result.ads.map((a) => ({ id: a.id, name: a.name })) }
}

const MAX_RANGE_DAYS = 90

/**
 * Historial día por día de una entidad puntual — ver
 * getMetaEntityDailyInsights (campaigns.ts). `sinceISO`/`untilISO` vienen
 * del Selector de Fechas Personalizado (Snapshots Pro, 2026-08-04) —
 * pueden ser un preset (7/14/30 días calculados en el cliente) o un rango
 * libre elegido a mano.
 */
export async function getEntitySnapshotAction(entityId: string, sinceISO: string, untilISO: string): Promise<MetaEntityDailyInsightsResult> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const since = new Date(sinceISO)
  const until = new Date(untilISO)
  if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime())) {
    return { ok: false, error: 'Rango de fechas inválido.' }
  }
  if (since > until) {
    return { ok: false, error: 'La fecha "desde" no puede ser posterior a "hasta".' }
  }
  const spanDays = (until.getTime() - since.getTime()) / 86400000
  if (spanDays > MAX_RANGE_DAYS) {
    return { ok: false, error: `El rango máximo es de ${MAX_RANGE_DAYS} días — achicá el período.` }
  }

  const token = await getMetaToken(activeOrganizationId)
  if (!token) return { ok: false, error: 'Conectá Meta Ads primero.' }

  return getMetaEntityDailyInsights(token, entityId, { since, until })
}
