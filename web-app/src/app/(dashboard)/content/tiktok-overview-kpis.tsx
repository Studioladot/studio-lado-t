import type { TiktokOverviewKpis } from '@/lib/tiktok/overview'
import { fmtCompactCount as fmtCount } from '@/lib/format/number'

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

// Mismo tratamiento visual que InstagramOverviewKpis a propósito (Paridad
// de Plataformas, 2026-08-06) — "Promedio de Vistas por Video" reemplaza a
// "Nuevos Seguidores": TikTok no tiene tracking de seguidores con el
// acceso actual a la API (mismo límite documentado en
// tiktok-video-detail-modal.tsx), inventar ese KPI mostraría un número
// falso. Esto sí es un dato 100% real del catálogo.
export function TiktokOverviewKpis({ kpis, periodLabel }: { kpis: TiktokOverviewKpis; periodLabel: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard label="Vistas totales" value={fmtCount(kpis.totalViews)} sub={periodLabel} />
      <KpiCard label="Interacciones totales" value={fmtCount(kpis.totalInteractions)} sub={periodLabel} />
      <KpiCard label="Tasa de engagement" value={fmtPercent(kpis.engagementRate)} sub="interacciones / vistas" />
      <KpiCard label="Promedio de vistas" value={fmtCount(kpis.avgViewsPerVideo)} sub="por video" />
    </div>
  )
}
