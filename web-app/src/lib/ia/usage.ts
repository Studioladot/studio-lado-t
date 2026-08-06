import type { SupabaseClient } from '@supabase/supabase-js'

// Rate limiting de consultas de IA por plan — auditoría de Unit Economics
// (2026-07-25): sin esto, cualquier organización podría generar consultas
// ilimitadas y comerse el margen de la suscripción en tokens. Plan Pro
// ilimitado; cualquier otro plan (incluido el trial) cae bajo un tope
// mensual. Reusa `organization_usage` (ya existía en la base, sin usar) en
// vez de crear una tabla nueva — no tiene un unique constraint declarado
// sobre (organization_id, metric_name, window_start), así que se resuelve
// a mano (buscar fila existente, update o insert), mismo criterio que ya
// usa fin_config.
//
// El número exacto del tope de Base no está definido todavía (mismo caso
// que el límite de cuentas de Meta del Plan Pro en Facturación) — 50
// consultas/mes es un default de arranque razonable, se ajusta acá sin
// tocar el resto del sistema el día que se cierre el número real.
const FREE_MONTHLY_IA_LIMIT = 50
const METRIC_NAME = 'ia_query'
const UNLIMITED_PLANS = new Set(['pro'])

export type IaUsageCheck = { allowed: true; remaining: number | null } | { allowed: false; limit: number }

function monthWindowStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export async function checkIaUsage(supabase: SupabaseClient, organizationId: string): Promise<IaUsageCheck> {
  const { data: org } = await supabase.from('organizations').select('plan').eq('id', organizationId).maybeSingle()
  if (org?.plan && UNLIMITED_PLANS.has(org.plan)) return { allowed: true, remaining: null }

  const windowStart = monthWindowStart()
  const { data: usage } = await supabase
    .from('organization_usage')
    .select('count')
    .eq('organization_id', organizationId)
    .eq('metric_name', METRIC_NAME)
    .eq('window_start', windowStart)
    .maybeSingle()

  const used = usage?.count ?? 0
  if (used >= FREE_MONTHLY_IA_LIMIT) return { allowed: false, limit: FREE_MONTHLY_IA_LIMIT }
  return { allowed: true, remaining: FREE_MONTHLY_IA_LIMIT - used }
}

/** Se llama solo después de una respuesta exitosa de la IA — si el chequeo bloqueó, nunca se llegó a gastar tokens y no hay nada que incrementar. */
export async function incrementIaUsage(supabase: SupabaseClient, organizationId: string): Promise<void> {
  const windowStart = monthWindowStart()
  const { data: existing } = await supabase
    .from('organization_usage')
    .select('id, count')
    .eq('organization_id', organizationId)
    .eq('metric_name', METRIC_NAME)
    .eq('window_start', windowStart)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('organization_usage')
      .update({ count: (existing.count ?? 0) + 1 })
      .eq('id', existing.id)
  } else {
    await supabase.from('organization_usage').insert({
      organization_id: organizationId,
      metric_name: METRIC_NAME,
      window_start: windowStart,
      count: 1,
    })
  }
}

// Desbloqueo Creativo — tope de 3 ideas por USUARIO por DÍA (2026-08-05),
// una capa aparte del cupo mensual por organización de arriba: ese cupo
// protege el gasto real en tokens a nivel cuenta, este protege que un solo
// usuario agote el botón para el resto del equipo en un rato. Reusa
// `organization_usage` (mismo criterio de "no crear tabla nueva por cada
// contador chico") codificando el user_id adentro de metric_name — la
// tabla no tiene una columna user_id propia, y agregarla exige una
// migración manual que el usuario tiene que aplicar; esto funciona ya,
// sin esperar ese paso.
const IDEA_GEN_DAILY_LIMIT = 3

function dayWindowStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
}

function ideaGenMetricName(userId: string): string {
  return `idea_gen_daily:${userId}`
}

export type IdeaGenUsageCheck = { allowed: true; remaining: number } | { allowed: false; remaining: 0 }

export async function checkIdeaGenDailyUsage(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<IdeaGenUsageCheck> {
  const { data: usage } = await supabase
    .from('organization_usage')
    .select('count')
    .eq('organization_id', organizationId)
    .eq('metric_name', ideaGenMetricName(userId))
    .eq('window_start', dayWindowStart())
    .maybeSingle()

  const used = usage?.count ?? 0
  if (used >= IDEA_GEN_DAILY_LIMIT) return { allowed: false, remaining: 0 }
  return { allowed: true, remaining: IDEA_GEN_DAILY_LIMIT - used }
}

/** Se llama solo después de una idea generada con éxito — mismo criterio que incrementIaUsage. */
export async function incrementIdeaGenDailyUsage(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<number> {
  const windowStart = dayWindowStart()
  const metricName = ideaGenMetricName(userId)
  const { data: existing } = await supabase
    .from('organization_usage')
    .select('id, count')
    .eq('organization_id', organizationId)
    .eq('metric_name', metricName)
    .eq('window_start', windowStart)
    .maybeSingle()

  const nextCount = (existing?.count ?? 0) + 1
  if (existing) {
    await supabase.from('organization_usage').update({ count: nextCount }).eq('id', existing.id)
  } else {
    await supabase.from('organization_usage').insert({
      organization_id: organizationId,
      metric_name: metricName,
      window_start: windowStart,
      count: nextCount,
    })
  }
  return Math.max(0, IDEA_GEN_DAILY_LIMIT - nextCount)
}
