import type { SupabaseClient } from '@supabase/supabase-js'

// Contador de consultas de IA por organización en `organization_usage`
// (una fila por organización y mes). Gotix es de uso interno: el contador
// queda para tener visibilidad del consumo, pero nunca bloquea una consulta.
const METRIC_NAME = 'ia_query'

export type IaUsageCheck = { allowed: true; remaining: number | null } | { allowed: false; limit: number }

function monthWindowStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

/** Sin cuota: siempre permite. Se mantiene la firma para no tocar a quienes la llaman. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function checkIaUsage(_supabase: SupabaseClient, _organizationId: string): Promise<IaUsageCheck> {
  return { allowed: true, remaining: null }
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
