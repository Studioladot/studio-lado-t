// Compartido entre el listado y el detalle de campañas — un solo lugar para
// traducir los effective_status/objective crudos de la Graph API de Meta.

import { formatMoney, type Currency } from '@/lib/currency'

export const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activa',
  PAUSED: 'Pausada',
  CAMPAIGN_PAUSED: 'Pausada',
  ADSET_PAUSED: 'Pausada',
  ARCHIVED: 'Archivada',
  DELETED: 'Eliminada',
  PENDING_REVIEW: 'En revisión',
  IN_PROCESS: 'En revisión',
  DISAPPROVED: 'Rechazada',
  PREAPPROVED: 'Preaprobada',
  PENDING_BILLING_INFO: 'Falta info de pago',
  WITH_ISSUES: 'Con problemas',
}

export const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'text-green',
  PAUSED: 'text-text-2',
  CAMPAIGN_PAUSED: 'text-text-2',
  ADSET_PAUSED: 'text-text-2',
  ARCHIVED: 'text-text-3',
  DELETED: 'text-text-3',
  PENDING_REVIEW: 'text-amber',
  IN_PROCESS: 'text-amber',
  DISAPPROVED: 'text-red',
  PREAPPROVED: 'text-accent',
  PENDING_BILLING_INFO: 'text-red',
  WITH_ISSUES: 'text-red',
}

export const PAUSED_LIKE = new Set(['PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED'])
export const TOGGLEABLE = new Set(['ACTIVE', 'PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED'])

/**
 * Mismo criterio active/paused/other que ya usaba page.tsx (nivel Campañas) —
 * extraído acá para que Conjuntos y Anuncios (filtrado en memoria, ver
 * [id]/entity-status-filter.tsx) apliquen exactamente la misma regla.
 */
export function matchesStatusFilter(effectiveStatus: string, filter: string) {
  if (filter === 'active') return effectiveStatus === 'ACTIVE'
  if (filter === 'paused') return PAUSED_LIKE.has(effectiveStatus)
  if (filter === 'other') return effectiveStatus !== 'ACTIVE' && !PAUSED_LIKE.has(effectiveStatus)
  return true
}

export function formatObjective(objective: string) {
  return objective
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function formatBudget(dailyBudget: number | null, lifetimeBudget: number | null, currency: Currency = 'ARS') {
  if (dailyBudget) return `${formatMoney(dailyBudget, currency)}/día`
  if (lifetimeBudget) return `${formatMoney(lifetimeBudget, currency)} total`
  return '—'
}

// Umbrales de color reales de app.html — no inventados. `--blue` del legado
// (la franja "bueno, no excelente") se mapea a `text-accent`, que es el mismo
// azul primario ya usado en el resto de esta app (ver frontend-taste.md: en
// la paleta original `--blue` ya era alias de `--primary-green`).

/** roasColor(), app.html:10591 — sin cambios. */
export function roasColor(roas: number) {
  if (roas >= 4) return 'text-green'
  if (roas >= 2) return 'text-accent'
  if (roas >= 1.5) return 'text-amber'
  return 'text-red'
}

/** Umbral "CTR (link)" de la tabla de Benchmarks, app.html:2064. */
export function ctrColor(ctr: number) {
  if (ctr > 2) return 'text-green'
  if (ctr >= 1.5) return 'text-accent'
  if (ctr >= 1) return 'text-amber'
  return 'text-red'
}

/** Umbral "CPM (USD)" de la tabla de Benchmarks, app.html:2065. */
export function cpmColor(cpm: number) {
  if (cpm <= 0) return 'text-text-2'
  if (cpm < 0.8) return 'text-green'
  if (cpm <= 1.5) return 'text-accent'
  if (cpm <= 3) return 'text-amber'
  return 'text-red'
}

/**
 * Mismo umbral que META_METRIC_DEFS.hook_rate en app.html:6614 (la versión
 * que corre en vivo en la tabla, no la de la página de Benchmarks — esa usa
 * otra escala para un "hook" ligeramente distinto y quedó desactualizada
 * frente al código real).
 */
export function hookRateColor(hookRate: number) {
  if (hookRate >= 15) return 'text-green'
  if (hookRate >= 8) return 'text-accent'
  return 'text-amber'
}

/**
 * Umbral "CPC (USD)" de la tabla de Benchmarks, app.html:2066 — igual que
 * ctrColor/cpmColor, es un umbral real que la tabla en vivo del legado
 * nunca aplicaba (META_METRIC_DEFS.cpc no existe, solo la tenía la página de
 * Benchmarks) pero que sí correspondía a esta métrica en USD.
 */
export function cpcColor(cpc: number) {
  if (cpc <= 0) return 'text-text-2'
  if (cpc < 0.05) return 'text-green'
  if (cpc <= 0.1) return 'text-accent'
  if (cpc <= 0.2) return 'text-amber'
  return 'text-red'
}

/** Umbral "Frecuencia" de la tabla de Benchmarks, app.html:2068 — mismo caso que cpcColor. */
export function frequencyColor(frequency: number) {
  if (frequency <= 0) return 'text-text-2'
  if (frequency <= 1.5) return 'text-green'
  if (frequency <= 2.5) return 'text-accent'
  if (frequency <= 4) return 'text-amber'
  return 'text-red'
}

// CPA no se colorea: el único umbral real que existe en el legado
// (Benchmarks, app.html:2069) está en ARS ("<$8K / $8K-15K / ..."), y esta
// app etiqueta el gasto en USD en todos lados (dashboard, Conexiones,
// presupuesto de campaña). Aplicar ese umbral tal cual sobre una cifra en
// USD daría lecturas incorrectas, así que CPA queda sin colorear hasta que
// haya un umbral real en USD que portar.
//
// Add to Cart, Checkout Iniciado (IC), Costo por IC, Costo por ATC, Valor de
// Conversión y AOV tampoco se colorean — ni el legado (META_METRIC_DEFS) ni
// la tabla de Benchmarks definen un umbral real para ninguna de estas, así
// que quedan sin colorear en vez de inventar uno.
