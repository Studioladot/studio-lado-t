import type { Database } from '@/lib/types/database.types'
import { sumOrNull } from './media-catalog-winners'

type AccountInsight = Database['public']['Tables']['instagram_account_insights']['Row']

export type AccountOverviewKpis = {
  totalViews: number | null
  totalInteractions: number | null
  newFollowers: number | null
  engagementRate: number | null
  totalProfileVisits: number | null
}

/**
 * KPIs de Nivel 1 (Visión Global de la Cuenta) — se suman sobre toda la
 * ventana recibida (accountInsights ya viene acotada por el DateRangePicker
 * de arriba). Si una métrica no tiene NINGÚN dato en la ventana el KPI
 * queda en null — nunca se muestra un 0 falso, mismo criterio de
 * honestidad de datos que ya usa instagram-metrics-sync.
 *
 * follower_count es el delta neto DIARIO que reporta la Graph API (no un
 * acumulado) — sumarlo da los seguidores netos ganados en el período, que es
 * exactamente "Nuevos Seguidores".
 *
 * La tasa de engagement usa interacciones/alcance — el alcance mide personas
 * únicas reales, más representativo que impresiones (que puede contar la
 * misma persona varias veces) para un ratio de "cuánta gente que vio algo
 * interactuó con eso".
 *
 * totalProfileVisits (profile_views) se sincroniza desde 2026-08-06 pero
 * nunca se mostraba en ningún lado — métrica huérfana real encontrada en
 * la auditoría del mismo día, ahora sí sumada acá y mostrada como 5to KPI.
 */
export function computeAccountOverviewKpis(data: AccountInsight[]): AccountOverviewKpis {
  const totalViews = sumOrNull(data.map((d) => d.impressions))
  const totalInteractions = sumOrNull(data.map((d) => d.total_interactions))
  const newFollowers = sumOrNull(data.map((d) => d.follower_count))
  const totalReach = sumOrNull(data.map((d) => d.reach))
  const totalProfileVisits = sumOrNull(data.map((d) => d.profile_views))

  const engagementRate =
    totalInteractions !== null && totalReach !== null && totalReach > 0 ? (totalInteractions / totalReach) * 100 : null

  return { totalViews, totalInteractions, newFollowers, engagementRate, totalProfileVisits }
}

export type ReachImpressionsPoint = { date: string; reach: number | null; impressions: number | null }
export type ProfileGrowthPoint = { date: string; crecimientoAcumulado: number }

/** Serie para "Alcance e Impresiones en el tiempo" — un punto por día, sin transformar. */
export function buildReachImpressionsSeries(data: AccountInsight[]): ReachImpressionsPoint[] {
  return data.map((d) => ({ date: d.captured_at, reach: d.reach, impressions: d.impressions }))
}

/**
 * Serie para "Crecimiento de Perfil" — como follower_count es un delta
 * diario, se acumula para mostrar una curva de crecimiento (lo que la
 * sección espera visualmente), no la cifra absoluta de seguidores totales
 * de la cuenta. Un día sin dato no interrumpe el acumulado: simplemente no
 * suma nada ese día.
 */
export function buildProfileGrowthSeries(data: AccountInsight[]): ProfileGrowthPoint[] {
  let running = 0
  return data.map((d) => {
    running += d.follower_count ?? 0
    return { date: d.captured_at, crecimientoAcumulado: running }
  })
}
