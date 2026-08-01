import type { MetaCampaignAd } from './campaigns'

// Motor de diagnóstico basado en reglas y umbrales — NO llama a ningún modelo
// de IA. Compara deltas entre las métricas de los anuncios seleccionados y
// redacta el hallazgo en texto plano. Es la base honesta sobre la que se
// podría enchufar un diagnóstico narrado por un LLM más adelante (ver
// propuesta "Comparador de Anuncios" — necesitaría una integración de IA que
// hoy esta app no tiene).

type MetricId = 'roas' | 'cpa' | 'ctr' | 'hookRate'

type MetricSpec = {
  id: MetricId
  label: string
  higherIsBetter: boolean
  format: (value: number) => string
}

const METRICS: MetricSpec[] = [
  { id: 'roas', label: 'ROAS', higherIsBetter: true, format: (v) => `${v.toFixed(2)}x` },
  { id: 'cpa', label: 'CPA', higherIsBetter: false, format: (v) => `$${v.toFixed(2)}` },
  { id: 'ctr', label: 'CTR', higherIsBetter: true, format: (v) => `${v.toFixed(2)}%` },
  { id: 'hookRate', label: 'Hook Rate', higherIsBetter: true, format: (v) => `${v.toFixed(1)}%` },
]

// Diferencias menores a esto entre el mejor y el peor no se mencionan — es
// ruido normal de muestra chica, no una señal real para actuar.
const NOISE_THRESHOLD_PCT = 15
// Ventaja de ROAS a partir de la cual vale la pena recomendar mover
// presupuesto, en vez de "seguir observando".
const CLEAR_WINNER_THRESHOLD_PCT = 20

export type AdDiagnosisBullet = { text: string; metric: MetricId }
export type AdDiagnosis = {
  bullets: AdDiagnosisBullet[]
  recommendation: string | null
  winnerId: string | null
  insufficientData: boolean
}

export function diagnoseAds(ads: MetaCampaignAd[]): AdDiagnosis {
  const withSpend = ads.filter((a) => a.spend > 0)

  if (withSpend.length < 2) {
    return {
      bullets: [],
      recommendation: null,
      winnerId: null,
      insufficientData: true,
    }
  }

  const bullets: AdDiagnosisBullet[] = []

  for (const metric of METRICS) {
    const withValue = withSpend.filter((a) => a[metric.id] > 0)
    if (withValue.length < 2) continue

    const sorted = [...withValue].sort((a, b) =>
      metric.higherIsBetter ? b[metric.id] - a[metric.id] : a[metric.id] - b[metric.id]
    )
    const best = sorted[0]
    const worst = sorted[sorted.length - 1]
    const bestVal = best[metric.id]
    const worstVal = worst[metric.id]
    if (bestVal === worstVal) continue

    const diffPct = Math.abs((bestVal - worstVal) / worstVal) * 100
    if (diffPct < NOISE_THRESHOLD_PCT) continue

    bullets.push({
      metric: metric.id,
      text: `"${best.name}" tiene mejor ${metric.label} que "${worst.name}" (${metric.format(bestVal)} vs ${metric.format(
        worstVal
      )} — ${Math.round(diffPct)}% de diferencia).`,
    })
  }

  const withRoas = withSpend.filter((a) => a.roas > 0)
  let winner: MetaCampaignAd | null = null
  let recommendation: string | null = null

  if (withRoas.length >= 2) {
    const sortedByRoas = [...withRoas].sort((a, b) => b.roas - a.roas)
    winner = sortedByRoas[0]
    const runnerUp = sortedByRoas[1]
    const gapPct = ((winner.roas - runnerUp.roas) / runnerUp.roas) * 100

    recommendation =
      gapPct > CLEAR_WINNER_THRESHOLD_PCT
        ? `"${winner.name}" es el más rentable del grupo (ROAS ${winner.roas.toFixed(
            2
          )}x, ${Math.round(gapPct)}% por encima del siguiente). Vale la pena mover presupuesto hacia ahí y revisar si conviene pausar el resto.`
        : 'El rendimiento está parejo entre los anuncios seleccionados — todavía no hay una diferencia de ROAS lo bastante clara como para mover presupuesto.'
  }

  return {
    bullets,
    recommendation,
    winnerId: winner?.id ?? null,
    insufficientData: false,
  }
}
