// Embudo genérico reutilizado en dos lugares (2026-07-27): Embudo Meta Ads
// (Impresiones→Clics→ATC→Checkout→Compra, mismos action_types que ya trae
// getMetaCampaigns) y Embudo Tienda Nube (Carritos Creados→Ventas Cerradas,
// GET /checkouts real — reemplazó el hueco que había quedado en la ronda
// anterior, cuando se asumió sin verificar que no existía endpoint público).

type FunnelStep = { label: string; value: number }

function fmt(n: number) {
  return Math.round(n).toLocaleString('es-AR')
}

export function FunnelPanel({ title, steps }: { title: string; steps: FunnelStep[] }) {
  const max = Math.max(...steps.map((s) => s.value), 1)

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-wide text-text-3">{title}</p>
      <div className="flex flex-col gap-2">
        {steps.map((step, i) => {
          const widthPct = Math.max(2, (step.value / max) * 100)
          const prevValue = i > 0 ? steps[i - 1].value : null
          const conversion = prevValue && prevValue > 0 ? (step.value / prevValue) * 100 : null

          return (
            <div key={step.label} className="flex items-center gap-3">
              <span className="w-[110px] shrink-0 text-[11px] font-medium text-text-2">{step.label}</span>
              <div className="h-5 flex-1 overflow-hidden rounded-control bg-surface-2/60">
                <div className="h-full rounded-control bg-accent transition-[width] duration-500" style={{ width: `${widthPct}%` }} />
              </div>
              <span className="w-[64px] shrink-0 text-right tabular-nums text-xs font-semibold text-text">{fmt(step.value)}</span>
              <span className="w-[42px] shrink-0 text-right text-[10px] text-text-3">{conversion !== null ? `${conversion.toFixed(0)}%` : ''}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
