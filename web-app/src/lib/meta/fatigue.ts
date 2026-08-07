import type { MetaEntityDailyPoint } from './campaigns'

// "Predicción de Fatiga" (2026-08-07, Innovación Radical #3) — mismo criterio
// de mitad-de-ventana-contra-mitad-de-ventana que computeEngagementTrend en
// src/lib/instagram/director-tip.ts, aplicado a la métrica que de verdad
// anticipa que un anuncio se está por apagar: la frecuencia (cuántas veces
// la MISMA persona ya lo vio) subiendo mientras el CTR (cuánto todavía le
// interesa) cae. Cualquiera de las dos solas puede ser ruido normal — la
// combinación de ambas, sostenida, es la señal real de fatiga creativa.
// Nunca se dispara con una sola señal ni con una ventana corta de ruido.

export type FatigueSignal = {
  frequencyBefore: number
  frequencyAfter: number
  ctrBefore: number
  ctrAfter: number
  ctrDropPct: number
}

const MIN_DAYS_PER_HALF = 3
const FREQUENCY_RISE_MIN = 0.3
const CTR_DROP_THRESHOLD_PCT = 20

function avg(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** `days` viene de getMetaEntityDailyInsights, ya ordenado cronológicamente. */
export function computeFatigueSignal(days: MetaEntityDailyPoint[]): FatigueSignal | null {
  const withData = days.filter((d) => d.impressions > 0)
  if (withData.length < MIN_DAYS_PER_HALF * 2) return null

  const mid = Math.floor(withData.length / 2)
  const before = withData.slice(0, mid)
  const after = withData.slice(mid)
  if (before.length < MIN_DAYS_PER_HALF || after.length < MIN_DAYS_PER_HALF) return null

  const frequencyBefore = avg(before.map((d) => d.frequency))
  const frequencyAfter = avg(after.map((d) => d.frequency))
  const ctrBefore = avg(before.map((d) => d.ctr))
  const ctrAfter = avg(after.map((d) => d.ctr))
  if (ctrBefore <= 0) return null

  const frequencyRose = frequencyAfter - frequencyBefore >= FREQUENCY_RISE_MIN
  const ctrDropPct = ((ctrBefore - ctrAfter) / ctrBefore) * 100
  const ctrFell = ctrDropPct >= CTR_DROP_THRESHOLD_PCT

  if (!frequencyRose || !ctrFell) return null

  return { frequencyBefore, frequencyAfter, ctrBefore, ctrAfter, ctrDropPct }
}
