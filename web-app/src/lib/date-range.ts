// Selector de rango de fechas — nació dentro de Instagram (2026-08-06) pero
// es 100% genérico (nada acá depende de una plataforma puntual), así que
// se movió a un lugar compartido cuando TikTok necesitó el mismo control
// (Paridad de Plataformas, 2026-08-06) en vez de duplicar la lógica de
// corte de fechas.
export type DateRangeMode = '7d' | '30d' | '90d' | 'all'

export const DATE_RANGE_OPTIONS: { value: DateRangeMode; label: string }[] = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: 'all', label: 'Todo el historial' },
]

function daysFor(mode: DateRangeMode): number | null {
  if (mode === '7d') return 7
  if (mode === '30d') return 30
  if (mode === '90d') return 90
  return null
}

/** Corte de fecha (YYYY-MM-DD) para el rango elegido — null para "Todo el historial" (sin corte). */
export function cutoffDateFor(mode: DateRangeMode): string | null {
  const days = daysFor(mode)
  if (days === null) return null
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return cutoff.toISOString().split('T')[0]
}

/** Filtra cualquier lista con fecha (YYYY-MM-DD o ISO completo) según el rango elegido. */
export function filterByDateRange<T>(items: T[], mode: DateRangeMode, dateOf: (item: T) => string | null): T[] {
  const cutoff = cutoffDateFor(mode)
  if (cutoff === null) return items
  return items.filter((item) => {
    const date = dateOf(item)
    return date !== null && date.slice(0, 10) >= cutoff
  })
}
