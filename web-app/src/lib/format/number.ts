// Formato compacto para números grandes en espacios chicos (1.284 / 12,9K /
// 1,2M) — mismo criterio "proporcional para números grandes" que el resto
// del panel usa con .toLocaleString('es-AR'), pero un espacio angosto (KPI
// card, overlay de una miniatura) no tiene lugar para "1.284.392" entero.
export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(1).replace('.', ',')}K`
  return n.toLocaleString('es-AR')
}

/** null nunca se muestra como 0 — mismo criterio de honestidad de datos que el resto de Gotix. */
export function fmtCompactCount(n: number | null): string {
  return n === null ? '—' : compactNumber(Math.round(n))
}
