import type { ProfitWaterfall } from '@/lib/tiendanube/finance'

// Cascada de Rentabilidad — mismo criterio de renderPnlWaterfall del legado
// (app.html:4556-4571): barras hand-rolled con `width` en %, sin librería de
// gráficos (zero dependencias nuevas, mismo criterio que el resto de GOTIX).

function money(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

export function WaterfallChart({ waterfall }: { waterfall: ProfitWaterfall }) {
  const max = Math.max(Math.abs(waterfall.bruto), 1)

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-wide text-text-3">Cascada de Rentabilidad</p>
      <div className="flex flex-col gap-2.5">
        {waterfall.steps.map((step, i) => {
          const isFirst = i === 0
          const isLast = i === waterfall.steps.length - 1
          const widthPct = Math.max(2, Math.min(100, (Math.abs(step.cumulative) / max) * 100))
          const barClass = isFirst ? 'bg-accent' : isLast ? (step.cumulative >= 0 ? 'bg-green' : 'bg-red') : 'bg-accent/40'
          const valueClass = isFirst || isLast ? 'text-text' : 'text-red'

          return (
            <div key={step.label} className="flex items-center gap-3">
              <span className="w-[132px] shrink-0 text-[11px] font-medium text-text-2">{step.label}</span>
              <div className="h-6 flex-1 overflow-hidden rounded-control bg-surface-2/60">
                <div className={`h-full rounded-control transition-[width] duration-500 ${barClass}`} style={{ width: `${widthPct}%` }} />
              </div>
              <span className={`w-[110px] shrink-0 text-right tabular-nums text-xs font-semibold ${valueClass}`}>
                {!isFirst && !isLast ? '−' : ''}
                {money(Math.abs(step.value))}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
