import type { AccountOverviewKpis } from '@/lib/instagram/account-overview'
import { compactNumber, fmtCompactCount as fmtCount } from '@/lib/format/number'

function fmtSigned(n: number | null): string {
  if (n === null) return '—'
  const rounded = Math.round(n)
  return rounded > 0 ? `+${compactNumber(rounded)}` : compactNumber(rounded)
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
