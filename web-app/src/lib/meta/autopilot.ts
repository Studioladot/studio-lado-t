import type { SupabaseClient } from '@supabase/supabase-js'
import type { MetaMetrics } from './campaigns'

// ---------------------------------------------------------------------------
// Playbooks — presets de un click sobre el mismo motor de reglas. Cada tipo
// tiene su propio shape de `params`, con defaults razonables precargados
// para que "prender" no exija configurar nada. La Edge Function
// (supabase/functions/autopilot-run/index.ts) es el runtime que de verdad
// ejecuta esto — este archivo es la mitad Next.js (persistencia + lectura
// para la UI), documentado como espejo intencional de esa función para las
// partes que ambos necesitan (labels, defaults, PLAYBOOK metadata).
// ---------------------------------------------------------------------------

export type PlaybookType = 'scale_budget' | 'stop_loss' | 'anti_fatigue'

export type ScaleBudgetParams = {
  increasePct: number
  intervalDays: number
  minConsecutiveDays: number
}

export type StopLossParams = {
  maxSpendNoAtc: number
}

export type AntiFatigueParams = {
  ctrDropPct: number
  maxFrequency: number
}

export type PlaybookParams = {
  scale_budget: ScaleBudgetParams
  stop_loss: StopLossParams
  anti_fatigue: AntiFatigueParams
}

// Tope duro server-side, no configurable por el usuario — evita que un
// salto de presupuesto agresivo le resetee la fase de aprendizaje a la
// campaña en Meta. La Edge Function aplica el mismo tope.
export const MAX_BUDGET_INCREASE_PCT = 30

export const PLAYBOOK_DEFS: {
  [K in PlaybookType]: {
    label: string
    helperText: string
    defaultParams: PlaybookParams[K]
  }
} = {
  scale_budget: {
    label: 'Escalado Automático',
    helperText: 'Sube el presupuesto si el estado estratégico se mantiene en ESCALAR varios días seguidos.',
    defaultParams: { increasePct: 20, intervalDays: 3, minConsecutiveDays: 3 },
  },
  stop_loss: {
    label: 'Stop-Loss / Guardián',
    helperText: 'Pausa el anuncio si gasta sin generar Agregar al Carrito. Si hay Checkout Iniciado sin compras, avisa en vez de pausar — ahí el problema no es el anuncio.',
    defaultParams: { maxSpendNoAtc: 30 },
  },
  anti_fatigue: {
    label: 'Rotación Anti-Fatiga',
    helperText: 'Avisa cuando un anuncio empieza a fatigar (cae el CTR o sube la Frecuencia) para que subas un creativo nuevo antes de que se note en el gasto.',
    defaultParams: { ctrDropPct: 25, maxFrequency: 3.5 },
  },
}

export type AutopilotPlaybookSetting<T extends PlaybookType = PlaybookType> = {
  playbookType: T
  enabled: boolean
  params: PlaybookParams[T]
}

/** Todos los playbooks de una campaña, con default (apagado, params de fábrica) para los que no tienen fila todavía. */
export async function getPlaybookSettings(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string
): Promise<AutopilotPlaybookSetting[]> {
  const { data } = await supabase
    .from('autopilot_playbook_settings')
    .select('playbook_type, enabled, params')
    .eq('organization_id', organizationId)
    .eq('campaign_id', campaignId)

  const byType = new Map((data ?? []).map((row) => [row.playbook_type, row]))

  return (Object.keys(PLAYBOOK_DEFS) as PlaybookType[]).map((playbookType) => {
    const row = byType.get(playbookType)
    return {
      playbookType,
      enabled: row?.enabled ?? false,
      params: { ...PLAYBOOK_DEFS[playbookType].defaultParams, ...(row?.params as object | undefined) },
    } as AutopilotPlaybookSetting
  })
}

export async function upsertPlaybookSetting(
  supabase: SupabaseClient,
  params: {
    organizationId: string
    campaignId: string
    playbookType: PlaybookType
    enabled: boolean
    playbookParams: Record<string, unknown>
    updatedBy: string | null
  }
) {
  const { error } = await supabase.from('autopilot_playbook_settings').upsert(
    {
      organization_id: params.organizationId,
      campaign_id: params.campaignId,
      playbook_type: params.playbookType,
      enabled: params.enabled,
      params: params.playbookParams,
      updated_at: new Date().toISOString(),
      updated_by: params.updatedBy,
    },
    { onConflict: 'organization_id,campaign_id,playbook_type' }
  )

  return !error
}

export type RunLogEntry = {
  id: string
  entityType: string
  entityName: string | null
  playbookType: string | null
  action: string
  message: string
  createdAt: string
}

/** Actividad reciente para el panel lateral — misma tabla que usa la Edge Function como freno "no repetir hoy". */
export async function getRunLog(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string,
  limit = 20
): Promise<RunLogEntry[]> {
  const { data } = await supabase
    .from('autopilot_run_log')
    .select('id, entity_type, entity_name, playbook_type, action, message, created_at')
    .eq('organization_id', organizationId)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    entityName: row.entity_name,
    playbookType: row.playbook_type,
    action: row.action,
    message: row.message,
    createdAt: row.created_at,
  }))
}

// ---------------------------------------------------------------------------
// Targets — dos niveles, no uno: "objetivo" (target_cpa/target_roas, cumple
// el margen de ganancia deseado) y "breakeven" (breakeven_cpa/breakeven_roas,
// el límite antes de perder plata). Antes esta app solo tenía un nivel
// (llamado "breakeven" pero usado como si fuera el único corte) — el usuario
// pidió el modelo de dos niveles real de Unit Economics de e-commerce, ver
// calculateUnitEconomics más abajo. Default de cuenta (campaign_id null) +
// override opcional por campaña, mismo criterio que ya tenía el modelo de
// un nivel (que a su vez portaba metaTargets/ad_targets del legado,
// app.html:10221-10230 — el legado nunca persistía el override por campaña).
// ---------------------------------------------------------------------------

export type CampaignTargets = {
  targetCpa: number
  targetRoas: number
  breakEvenCpa: number
  breakEvenRoas: number
}

const FALLBACK_TARGETS: CampaignTargets = { targetCpa: 18, targetRoas: 2, breakEvenCpa: 25, breakEvenRoas: 1.4 }

type TargetsRow = {
  target_cpa: number | null
  target_roas: number | null
  breakeven_cpa: number | null
  breakeven_roas: number | null
}

function mergeTargetsRow(row: TargetsRow | null | undefined, fallback: CampaignTargets): CampaignTargets {
  return {
    targetCpa: row?.target_cpa ?? fallback.targetCpa,
    targetRoas: row?.target_roas ?? fallback.targetRoas,
    breakEvenCpa: row?.breakeven_cpa ?? fallback.breakEvenCpa,
    breakEvenRoas: row?.breakeven_roas ?? fallback.breakEvenRoas,
  }
}

export async function getCampaignTargets(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string
): Promise<CampaignTargets> {
  const { data } = await supabase
    .from('campaign_targets')
    .select('campaign_id, target_cpa, target_roas, breakeven_cpa, breakeven_roas')
    .eq('organization_id', organizationId)
    .in('campaign_id', [campaignId])

  const { data: accountDefaultRow } = await supabase
    .from('campaign_targets')
    .select('target_cpa, target_roas, breakeven_cpa, breakeven_roas')
    .eq('organization_id', organizationId)
    .is('campaign_id', null)
    .maybeSingle()

  const accountDefault = mergeTargetsRow(accountDefaultRow, FALLBACK_TARGETS)
  return mergeTargetsRow(data?.[0], accountDefault)
}

/**
 * Todos los targets de la organización en una sola query (default de cuenta
 * + overrides por campaña) — usado por la lista de Campañas para resolver el
 * target de cada fila sin un N+1 (una query por campaña).
 */
export async function getAllCampaignTargets(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ accountDefault: CampaignTargets; overrides: Record<string, CampaignTargets> }> {
  const { data } = await supabase
    .from('campaign_targets')
    .select('campaign_id, target_cpa, target_roas, breakeven_cpa, breakeven_roas')
    .eq('organization_id', organizationId)

  const defaultRow = (data ?? []).find((row) => row.campaign_id === null)
  const accountDefault = mergeTargetsRow(defaultRow, FALLBACK_TARGETS)

  const overrides: Record<string, CampaignTargets> = {}
  for (const row of data ?? []) {
    if (!row.campaign_id) continue
    overrides[row.campaign_id] = mergeTargetsRow(row, accountDefault)
  }

  return { accountDefault, overrides }
}

export function resolveCampaignTargets(
  campaignId: string,
  bulk: { accountDefault: CampaignTargets; overrides: Record<string, CampaignTargets> }
): CampaignTargets {
  return bulk.overrides[campaignId] ?? bulk.accountDefault
}

export async function upsertCampaignTargets(
  supabase: SupabaseClient,
  params: {
    organizationId: string
    campaignId: string | null
    targetCpa: number
    targetRoas: number
    breakEvenCpa: number
    breakEvenRoas: number
    unitEconomics?: UnitEconomicsInputs | null
  }
) {
  const { error } = await supabase.from('campaign_targets').upsert(
    {
      organization_id: params.organizationId,
      campaign_id: params.campaignId,
      target_cpa: params.targetCpa,
      target_roas: params.targetRoas,
      breakeven_cpa: params.breakEvenCpa,
      breakeven_roas: params.breakEvenRoas,
      ...(params.unitEconomics !== undefined ? { unit_economics: params.unitEconomics } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,campaign_id' }
  )

  return !error
}

export async function getUnitEconomicsInputs(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string
): Promise<UnitEconomicsInputs | null> {
  const { data } = await supabase
    .from('campaign_targets')
    .select('unit_economics')
    .eq('organization_id', organizationId)
    .eq('campaign_id', campaignId)
    .maybeSingle()

  return (data?.unit_economics as UnitEconomicsInputs | null) ?? null
}

/**
 * La fila default de cuenta (campaign_id null) directamente — no la versión
 * "resuelta con override" que usan getCampaignTargets/getAllCampaignTargets,
 * sino la fila en sí, para la pantalla de Rentabilidad a nivel cuenta donde
 * el usuario edita ESE default, no el de una campaña puntual.
 */
export async function getAccountDefaultTargets(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ targets: CampaignTargets; unitEconomics: UnitEconomicsInputs | null }> {
  const { data } = await supabase
    .from('campaign_targets')
    .select('target_cpa, target_roas, breakeven_cpa, breakeven_roas, unit_economics')
    .eq('organization_id', organizationId)
    .is('campaign_id', null)
    .maybeSingle()

  return {
    targets: mergeTargetsRow(data, FALLBACK_TARGETS),
    unitEconomics: (data?.unit_economics as UnitEconomicsInputs | null) ?? null,
  }
}

// ---------------------------------------------------------------------------
// Calculadora de Unit Economics — estructura real de e-commerce: de cada
// venta (Ticket Promedio) se descuenta Costo de Producto, Costos de
// Financiación/Pasarelas e Impuestos, todos como % del ticket. Lo que queda
// es el margen disponible para gastar en ads sin perder plata (breakeven);
// si además reservás el Margen de Ganancia Deseado antes de gastar en ads,
// obtenés el CPA/ROAS objetivo. Mismo concepto que finConfig.margen_bruto
// del motor de P&L del legado, aplicado a nivel campaña.
// ---------------------------------------------------------------------------

export type UnitEconomicsInputs = {
  aov: number
  costProductPct: number
  paymentFeesPct: number
  taxesPct: number
  desiredMarginPct: number
}

export type UnitEconomicsResult = {
  breakEvenCpa: number
  breakEvenRoas: number
  targetCpa: number
  targetRoas: number
  // null cuando los costos+impuestos ya superan el 100% del ticket, o el
  // margen deseado no entra en lo que queda — no hay CPA que lo resuelva,
  // el problema es de precio/costos, no de medios pagos.
  error: string | null
}

export function calculateUnitEconomics(inputs: UnitEconomicsInputs): UnitEconomicsResult {
  const { aov, costProductPct, paymentFeesPct, taxesPct, desiredMarginPct } = inputs
  const marginAvailablePct = 1 - costProductPct / 100 - paymentFeesPct / 100 - taxesPct / 100

  if (aov <= 0 || marginAvailablePct <= 0) {
    return {
      breakEvenCpa: 0,
      breakEvenRoas: 0,
      targetCpa: 0,
      targetRoas: 0,
      error: 'El costo de producto + pasarelas + impuestos ya consume el 100% (o más) del ticket promedio — no hay margen para pagar medios, revisá los porcentajes.',
    }
  }

  const targetMarginPct = marginAvailablePct - desiredMarginPct / 100
  if (targetMarginPct <= 0) {
    return {
      breakEvenCpa: Math.round(aov * marginAvailablePct * 100) / 100,
      breakEvenRoas: Math.round((1 / marginAvailablePct) * 100) / 100,
      targetCpa: 0,
      targetRoas: 0,
      error: 'El margen de ganancia deseado es mayor al margen disponible después de costos e impuestos — no hay CPA que lo cumpla con este ticket. Bajá el margen deseado o subí el ticket.',
    }
  }

  return {
    breakEvenCpa: Math.round(aov * marginAvailablePct * 100) / 100,
    breakEvenRoas: Math.round((1 / marginAvailablePct) * 100) / 100,
    targetCpa: Math.round(aov * targetMarginPct * 100) / 100,
    targetRoas: Math.round((1 / targetMarginPct) * 100) / 100,
    error: null,
  }
}

// ---------------------------------------------------------------------------
// Estado estratégico — puerto de metaStrategicStatus (app.html:10325),
// reordenado para evaluar primordialmente el CPA (pedido explícito del
// usuario), no el ROAS primero. 3 niveles: ESCALAR (CPA ya cumple el
// objetivo) / OPTIMIZAR (rentable — por debajo del breakeven — pero no
// llega al objetivo) / KILL (CPA superó el breakeven, pérdida real).
// ---------------------------------------------------------------------------

export type StrategicStatus = {
  label: 'escalar' | 'optimizar' | 'kill'
  reason: string
}

export type MetaMetricsForStatus = Pick<MetaMetrics, 'roas' | 'cpa' | 'spend' | 'purchases'>

export function getStrategicStatus(metrics: MetaMetricsForStatus, targets: CampaignTargets): StrategicStatus | null {
  // Sin gasto todavía no hay diagnóstico posible — no inventamos un estado.
  if (metrics.spend <= 0) return null

  if (metrics.purchases > 0 && metrics.cpa > 0) {
    if (metrics.cpa <= targets.targetCpa) {
      return {
        label: 'escalar',
        reason: `CPA de $${metrics.cpa.toFixed(2)} está en o por debajo de tu CPA objetivo de $${targets.targetCpa.toFixed(2)} — está cumpliendo el margen que buscás.`,
      }
    }
    if (metrics.cpa <= targets.breakEvenCpa) {
      return {
        label: 'optimizar',
        reason: `CPA de $${metrics.cpa.toFixed(2)} está por debajo del punto de equilibrio ($${targets.breakEvenCpa.toFixed(2)}) pero por encima de tu objetivo ($${targets.targetCpa.toFixed(2)}) — es rentable pero no llega al margen que buscás.`,
      }
    }
    return {
      label: 'kill',
      reason: `CPA de $${metrics.cpa.toFixed(2)} superó tu punto de equilibrio de $${targets.breakEvenCpa.toFixed(2)} — te está haciendo perder plata.`,
    }
  }

  return {
    label: 'optimizar',
    reason: `Gastó $${metrics.spend.toFixed(0)} todavía sin compras registradas — sin señal suficiente para diagnosticar CPA.`,
  }
}

/** Semáforo de la columna CPA — verde/ámbar/rojo según los dos umbrales de CampaignTargets, no un umbral fijo. */
export function cpaColorByTargets(cpa: number, targets: CampaignTargets): string {
  if (cpa <= 0) return 'text-text-2'
  if (cpa <= targets.targetCpa) return 'text-green'
  if (cpa <= targets.breakEvenCpa) return 'text-amber'
  return 'text-red'
}

/** Semáforo de la columna ROAS — mismo criterio que cpaColorByTargets, dirección inversa. */
export function roasColorByTargets(roas: number, targets: CampaignTargets): string {
  if (roas <= 0) return 'text-text-2'
  if (roas >= targets.targetRoas) return 'text-green'
  if (roas >= targets.breakEvenRoas) return 'text-amber'
  return 'text-red'
}

// ---------------------------------------------------------------------------
// Métricas evaluables por el modo avanzado (reglas custom) — mismo rol que
// AP_METRICS del legado (app.html:7411-7417), extendido con las que pedía
// el directive #4 (ATC, Pagos Iniciados, Frecuencia, CTR, AOV) que el
// legado nunca tuvo disponibles para armar condiciones.
// ---------------------------------------------------------------------------

export const AP_METRICS: {
  [key: string]: { label: string; unit: string; extract: (m: MetaMetrics) => number }
} = {
  roas: { label: 'ROAS', unit: 'x', extract: (m) => m.roas },
  cpa: { label: 'CPA', unit: '$', extract: (m) => m.cpa },
  spend: { label: 'Gasto', unit: '$', extract: (m) => m.spend },
  purchases: { label: 'Compras', unit: '', extract: (m) => m.purchases },
  cpc: { label: 'CPC', unit: '$', extract: (m) => m.cpc },
  ctr: { label: 'CTR', unit: '%', extract: (m) => m.ctr },
  frequency: { label: 'Frecuencia', unit: '', extract: (m) => m.frequency },
  addToCart: { label: 'Agregar al Carrito', unit: '', extract: (m) => m.addToCart },
  initiateCheckout: { label: 'Checkout Iniciado', unit: '', extract: (m) => m.initiateCheckout },
  aov: { label: 'Ticket Promedio (AOV)', unit: '$', extract: (m) => m.aov },
}

// ---------------------------------------------------------------------------
// Kill switch de cuenta — un update en bloque, no un loop de togglear cada
// fila una por una (que además dispararía N revalidaciones). Apaga, nunca
// borra: las configuraciones (params, umbrales) quedan intactas para cuando
// el usuario las quiera volver a prender.
// ---------------------------------------------------------------------------

export async function pauseAllPlaybooks(supabase: SupabaseClient, organizationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('autopilot_playbook_settings')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('enabled', true)

  return !error
}

// ---------------------------------------------------------------------------
// Notificaciones de cuenta — un canal (email) activo hoy, whatsapp_number
// queda en la fila sin lógica de envío (WhatsApp Business API es un
// onboarding de Meta aparte del Meta Ads API ya conectado). La Edge
// Function lee esta misma fila para decidir si manda el resumen de la
// corrida.
// ---------------------------------------------------------------------------

export type NotificationSettings = {
  email: string | null
  whatsappNumber: string | null
  enabled: boolean
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = { email: null, whatsappNumber: null, enabled: true }

export async function getNotificationSettings(
  supabase: SupabaseClient,
  organizationId: string
): Promise<NotificationSettings> {
  const { data } = await supabase
    .from('organization_notification_settings')
    .select('email, whatsapp_number, enabled')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (!data) return DEFAULT_NOTIFICATION_SETTINGS
  return { email: data.email, whatsappNumber: data.whatsapp_number, enabled: data.enabled }
}

export async function upsertNotificationSettings(
  supabase: SupabaseClient,
  organizationId: string,
  settings: { email: string | null; enabled: boolean }
): Promise<boolean> {
  const { error } = await supabase.from('organization_notification_settings').upsert(
    {
      organization_id: organizationId,
      email: settings.email,
      enabled: settings.enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' }
  )

  return !error
}

// ---------------------------------------------------------------------------
// Log agregado de cuenta — mismas columnas que getRunLog, sin filtrar por
// campaign_id, más campaign_name (denormalizado por la Edge Function al
// escribir, ver la migración autopilot_hardening_and_extras) para no
// depender de un join contra Meta en cada lectura de esta pantalla.
// ---------------------------------------------------------------------------

export type OrgRunLogEntry = RunLogEntry & { campaignName: string | null }

export async function getOrganizationRunLog(
  supabase: SupabaseClient,
  organizationId: string,
  limit = 30
): Promise<OrgRunLogEntry[]> {
  const { data } = await supabase
    .from('autopilot_run_log')
    .select('id, entity_type, entity_name, playbook_type, action, message, created_at, campaign_name')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    entityName: row.entity_name,
    playbookType: row.playbook_type,
    action: row.action,
    message: row.message,
    createdAt: row.created_at,
    campaignName: row.campaign_name,
  }))
}

// ---------------------------------------------------------------------------
// Reglas personalizadas (modo Avanzado) — mismo motor conceptual que los
// playbooks, pero condiciones libres en vez de un preset fijo. La Edge
// Function es quien de verdad las evalúa/ejecuta (autopilot-run/index.ts);
// estas funciones son la mitad Next.js (persistencia + lectura para la UI),
// mismo criterio que getPlaybookSettings/upsertPlaybookSetting arriba.
// ---------------------------------------------------------------------------

export type RuleOperator = 'lt' | 'gt' | 'eq'

export type RuleCondition = {
  metric: string
  operator: RuleOperator
  value: number
}

export type RuleAction = 'pause' | 'reduce_budget' | 'increase_budget' | 'notify'

export type CustomRuleParams = {
  // Solo relevante cuando action es reduce_budget/increase_budget — mismo
  // tope duro que MAX_BUDGET_INCREASE_PCT para subas, y un piso simétrico
  // para bajas (nunca más del 50% de un salto) aplicado en la Edge Function.
  budgetChangePct?: number
}

export type CustomRule = {
  id: string
  campaignId: string | null
  name: string
  conditions: RuleCondition[]
  windowDays: number
  minSpend: number
  action: RuleAction
  params: CustomRuleParams
  active: boolean
}

/** campaignId null trae también las reglas de cuenta (campaign_id is null en la tabla) — a diferencia de getPlaybookSettings, acá SÍ tiene sentido ver ambas juntas: una regla de cuenta puede convivir con reglas puntuales de esa campaña. */
export async function getCustomRules(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string
): Promise<CustomRule[]> {
  const { data } = await supabase
    .from('autopilot_custom_rules')
    .select('id, campaign_id, name, conditions, window_days, min_spend, action, params, active')
    .eq('organization_id', organizationId)
    .or(`campaign_id.eq.${campaignId},campaign_id.is.null`)
    .order('created_at', { ascending: false })

  return (data ?? []).map((row) => ({
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    conditions: (row.conditions ?? []) as RuleCondition[],
    windowDays: row.window_days,
    minSpend: Number(row.min_spend),
    action: row.action as RuleAction,
    params: (row.params ?? {}) as CustomRuleParams,
    active: row.active,
  }))
}

export async function upsertCustomRule(
  supabase: SupabaseClient,
  params: {
    id?: string
    organizationId: string
    campaignId: string | null
    name: string
    conditions: RuleCondition[]
    windowDays: number
    minSpend: number
    action: RuleAction
    ruleParams: CustomRuleParams
    active: boolean
    createdBy: string | null
  }
): Promise<boolean> {
  // Fix de seguridad (auditoría 2026-08-21): params.id viene del cliente al
  // editar una regla existente. Sin este chequeo, un upsert sin
  // `onConflict` resuelve el conflicto por la primary key (id) — si ese id
  // coincidía con una regla de OTRA organización, el upsert la sobrescribía
  // por completo (organization_id incluido), secuestrándola. Se verifica
  // acá que la regla exista y sea de esta organización antes de tocarla,
  // mismo criterio que ya usa deleteCustomRule.
  if (params.id) {
    const { data: owned } = await supabase
      .from('autopilot_custom_rules')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', params.organizationId)
      .maybeSingle()
    if (!owned) return false
  }

  const { error } = await supabase.from('autopilot_custom_rules').upsert({
    ...(params.id ? { id: params.id } : {}),
    organization_id: params.organizationId,
    campaign_id: params.campaignId,
    name: params.name,
    conditions: params.conditions,
    window_days: params.windowDays,
    min_spend: params.minSpend,
    action: params.action,
    params: params.ruleParams,
    active: params.active,
    created_by: params.createdBy,
  })

  return !error
}

export async function deleteCustomRule(supabase: SupabaseClient, organizationId: string, ruleId: string): Promise<boolean> {
  const { error } = await supabase
    .from('autopilot_custom_rules')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', ruleId)

  return !error
}
