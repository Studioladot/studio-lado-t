import type { AccountOverviewKpis } from '@/lib/instagram/account-overview'

// Formato compacto para números grandes en una tarjeta KPI (1.284 / 12,9K /
// 1,2M) — mismo criterio "proporcional para números grandes" que el resto
// del panel usa con .toLocaleString('es-AR'), pero una tarjeta de 2 líneas
// no tiene lugar para "1.284.392" entero sin partirse.
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(1).replace('.', ',')}K`
  return n.toLocaleString('es-AR')
}

function fmtCount(n: number | null): string {
  return n === null ? '—' : compact(Math.round(n))
}

function fmtSigned(n: number | null): string {
  if (n === null) return '—'
  const rounded = Math.round(n)
  return rounded > 0 ? `+${compact(rounded)}` : compact(rounded)
}

function fmtPercent(n: number | null): string {
  return n === null ? '—' : `${n.toFixed(1)}%`
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="metric-card rounded-card px-4 pb-3 pt-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums text-text">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-text-3">{sub}</p>}
    </div>
  )
}

// Nivel 1 del panel de Analítica Avanzada — Visión Global de la Cuenta
// (2026-08-06). Los 4 KPI pedidos, en el mismo orden en que aparecen acá.
export function InstagramOverviewKpis({ kpis, periodLabel }: { kpis: AccountOverviewKpis; periodLabel: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard label="Vistas totales" value={fmtCount(kpis.totalViews)} sub={periodLabel} />
      <KpiCard label="Interacciones totales" value={fmtCount(kpis.totalInteractions)} sub={periodLabel} />
      <KpiCard label="Nuevos seguidores" value={fmtSigned(kpis.newFollowers)} sub={periodLabel} />
      <KpiCard label="Tasa de engagement" value={fmtPercent(kpis.engagementRate)} sub="interacciones / alcance" />
    </div>
  )
}
