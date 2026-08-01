'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { createClient } from '@/lib/supabase/server'
import {
  upsertPlaybookSetting,
  upsertCampaignTargets,
  getPlaybookSettings,
  getRunLog,
  getCampaignTargets,
  getUnitEconomicsInputs,
  getAccountDefaultTargets,
  pauseAllPlaybooks,
  getOrganizationRunLog,
  getNotificationSettings,
  upsertNotificationSettings,
  getCustomRules,
  upsertCustomRule,
  deleteCustomRule,
  PLAYBOOK_DEFS,
  type PlaybookType,
  type AutopilotPlaybookSetting,
  type RunLogEntry,
  type OrgRunLogEntry,
  type CampaignTargets,
  type UnitEconomicsInputs,
  type NotificationSettings,
  type CustomRule,
  type RuleCondition,
  type RuleAction,
  type CustomRuleParams,
} from '@/lib/meta/autopilot'

// A diferencia de toggleCampaignStatusAction (../actions.ts) — que usa
// <form action redirect> porque es una fila de tabla donde un reload de
// página es aceptable — estas se llaman directo desde el panel corredizo
// (await accion(...)), sin redirect ni FormData, para que el panel no se
// cierre ni la página recargue cada vez que el usuario prende un switch.
// Mismo criterio "llamar y esperar" que ya usa getLaunchWizardDataAction
// (../new/data-actions.ts).

function isPlaybookType(value: string): value is PlaybookType {
  return value in PLAYBOOK_DEFS
}

export type AutopilotPanelData = {
  playbooks: AutopilotPlaybookSetting[]
  runLog: RunLogEntry[]
  targets: CampaignTargets
  unitEconomics: UnitEconomicsInputs | null
}

export async function getAutopilotPanelDataAction(campaignId: string): Promise<AutopilotPanelData | { error: string }> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const [playbooks, runLog, targets, unitEconomics] = await Promise.all([
    getPlaybookSettings(supabase, activeOrganizationId, campaignId),
    getRunLog(supabase, activeOrganizationId, campaignId),
    getCampaignTargets(supabase, activeOrganizationId, campaignId),
    getUnitEconomicsInputs(supabase, activeOrganizationId, campaignId),
  ])

  return { playbooks, runLog, targets, unitEconomics }
}

export async function toggleAutopilotPlaybookAction(params: {
  campaignId: string
  playbookType: string
  enabled: boolean
  playbookParams: Record<string, unknown>
}): Promise<{ ok: boolean; error?: string }> {
  if (!isPlaybookType(params.playbookType)) return { ok: false, error: 'Playbook inválido.' }

  const { activeOrganizationId, userId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const ok = await upsertPlaybookSetting(supabase, {
    organizationId: activeOrganizationId,
    campaignId: params.campaignId,
    playbookType: params.playbookType,
    enabled: params.enabled,
    playbookParams: params.playbookParams,
    updatedBy: userId,
  })

  revalidatePath(`/meta-ads/campaigns/${params.campaignId}`)
  revalidatePath('/meta-ads/campaigns')

  return ok ? { ok: true } : { ok: false, error: 'No se pudo actualizar el playbook.' }
}

export async function updateCampaignTargetAction(params: {
  // null = default de cuenta (pantalla de Rentabilidad), no una campaña puntual.
  campaignId: string | null
  targetCpa: number
  targetRoas: number
  breakEvenCpa: number
  breakEvenRoas: number
  unitEconomics?: UnitEconomicsInputs | null
}): Promise<{ ok: boolean; error?: string }> {
  const values = [params.targetCpa, params.targetRoas, params.breakEvenCpa, params.breakEvenRoas]
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) {
    return { ok: false, error: 'Objetivos inválidos.' }
  }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const ok = await upsertCampaignTargets(supabase, {
    organizationId: activeOrganizationId,
    campaignId: params.campaignId,
    targetCpa: params.targetCpa,
    targetRoas: params.targetRoas,
    breakEvenCpa: params.breakEvenCpa,
    breakEvenRoas: params.breakEvenRoas,
    unitEconomics: params.unitEconomics,
  })

  if (params.campaignId) revalidatePath(`/meta-ads/campaigns/${params.campaignId}`)
  revalidatePath('/meta-ads/campaigns')
  revalidatePath('/meta-ads/profitability')

  return ok ? { ok: true } : { ok: false, error: 'No se pudieron guardar los objetivos.' }
}

export async function getAccountDefaultTargetsAction(): Promise<
  { targets: CampaignTargets; unitEconomics: UnitEconomicsInputs | null } | { error: string }
> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  return getAccountDefaultTargets(supabase, activeOrganizationId)
}

// ---------------------------------------------------------------------------
// Kill switch, prueba manual, notificaciones, log de cuenta, reglas custom
// — cierre del audit check del módulo (2026-07-24).
// ---------------------------------------------------------------------------

export async function pauseAllAutopilotAction(): Promise<{ ok: boolean; error?: string }> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const ok = await pauseAllPlaybooks(supabase, activeOrganizationId)

  revalidatePath('/meta-ads/campaigns')
  revalidatePath('/meta-ads/profitability')

  return ok ? { ok: true } : { ok: false, error: 'No se pudo pausar el Autopiloto.' }
}

export type TestAutopilotRunResult = { ok: true; processed: number; actions: string[]; message?: string } | { ok: false; error: string }

/**
 * Corre el Autopiloto de verdad contra Meta, acotado a esta única campaña
 * — nunca con la service-role key (esa vive solo en el secret de la Edge
 * Function). Usa el access_token de la sesión real del usuario, que la
 * función valida server-side antes de tocar nada. Puede pausar/ajustar algo
 * real si las condiciones se cumplen — no es un dry-run.
 */
export async function testAutopilotRunAction(campaignId: string): Promise<TestAutopilotRunResult> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) return { ok: false, error: 'Sesión inválida.' }

  const functionsUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/autopilot-run`

  try {
    const res = await fetch(functionsUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: activeOrganizationId, campaignId }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data?.error ?? 'La corrida de prueba falló.' }

    revalidatePath(`/meta-ads/campaigns/${campaignId}`)
    revalidatePath('/meta-ads/campaigns')
    revalidatePath('/meta-ads/profitability')

    return { ok: true, processed: data.processed ?? 0, actions: data.actions ?? [], message: data.message }
  } catch {
    return { ok: false, error: 'No se pudo conectar con el Autopiloto — probá de nuevo en unos segundos.' }
  }
}

export async function getOrganizationRunLogAction(): Promise<OrgRunLogEntry[] | { error: string }> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  return getOrganizationRunLog(supabase, activeOrganizationId)
}

export async function getNotificationSettingsAction(): Promise<NotificationSettings | { error: string }> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  return getNotificationSettings(supabase, activeOrganizationId)
}

export async function upsertNotificationSettingsAction(params: {
  email: string | null
  enabled: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const ok = await upsertNotificationSettings(supabase, activeOrganizationId, params)

  revalidatePath('/meta-ads/profitability')

  return ok ? { ok: true } : { ok: false, error: 'No se pudieron guardar las notificaciones.' }
}

export async function getCustomRulesAction(campaignId: string): Promise<CustomRule[] | { error: string }> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  return getCustomRules(supabase, activeOrganizationId, campaignId)
}

export async function upsertCustomRuleAction(params: {
  id?: string
  campaignId: string
  name: string
  conditions: RuleCondition[]
  windowDays: number
  minSpend: number
  action: RuleAction
  ruleParams: CustomRuleParams
  active: boolean
}): Promise<{ ok: boolean; error?: string }> {
  if (!params.name.trim()) return { ok: false, error: 'La regla necesita un nombre.' }
  if (!params.conditions.length) return { ok: false, error: 'Agregá al menos una condición.' }

  const { activeOrganizationId, userId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const ok = await upsertCustomRule(supabase, {
    id: params.id,
    organizationId: activeOrganizationId,
    campaignId: params.campaignId,
    name: params.name.trim(),
    conditions: params.conditions,
    windowDays: params.windowDays,
    minSpend: params.minSpend,
    action: params.action,
    ruleParams: params.ruleParams,
    active: params.active,
    createdBy: userId,
  })

  revalidatePath(`/meta-ads/campaigns/${params.campaignId}`)

  return ok ? { ok: true } : { ok: false, error: 'No se pudo guardar la regla.' }
}

export async function deleteCustomRuleAction(ruleId: string, campaignId: string): Promise<{ ok: boolean; error?: string }> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const ok = await deleteCustomRule(supabase, activeOrganizationId, ruleId)

  revalidatePath(`/meta-ads/campaigns/${campaignId}`)

  return ok ? { ok: true } : { ok: false, error: 'No se pudo borrar la regla.' }
}
