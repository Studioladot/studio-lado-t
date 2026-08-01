import type { MetaCampaign } from '@/lib/meta/campaigns'
import { roasColor } from './status'

// Versión simplificada del "Modo Focus" de app.html:1817 — el legado también
// muestra beneficio neto real usando el margen bruto configurado en el
// módulo de Finanzas, que todavía no existe en esta app. Estas 4 tarjetas
// son las que se pueden calcular hoy solo con datos de Meta Ads.
export function FocusCards({ campaigns }: { campaigns: MetaCampaign[] }) {
  const active = campaigns.filter((c) => c.effectiveStatus === 'ACTIVE')
  const spend = active.reduce((sum, c) => sum + c.spend, 0)
  const revenue = active.reduce((sum, c) => sum + c.revenue, 0)
  const purchases = active.reduce((sum, c) => sum + c.purchases, 0)
  const roas = spend > 0 && revenue > 0 ? revenue / spend : 0
  const cpa = purchases > 0 ? spend / purchases : 0

  return (
    <div>
      <p className="mb-3 text-xs text-text-3">
        {active.length} campaña{active.length === 1 ? '' : 's'} activa{active.length === 1 ? '' : 's'} en el período
        seleccionado
      </p>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-4">
        <div className="flex flex-col justify-between gap-3 bg-surface p-5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-3">Gasto total</span>
          <span className="text-2xl font-extrabold tracking-[-0.03em] text-text">USD {spend.toFixed(0)}</span>
        </div>
        <div className="flex flex-col justify-between gap-3 bg-surface p-5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-3">Ventas totales</span>
          <span className="text-2xl font-extrabold tracking-[-0.03em] text-text">USD {revenue.toFixed(0)}</span>
        </div>
        <div className="flex flex-col justify-between gap-3 bg-surface p-5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-3">ROAS</span>
          <span className={`text-2xl font-extrabold tracking-[-0.03em] ${roas > 0 ? roasColor(roas) : 'text-text'}`}>
            {roas > 0 ? `${roas.toFixed(2)}x` : '—'}
          </span>
        </div>
        <div className="flex flex-col justify-between gap-3 bg-surface p-5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-3">CPA</span>
          <span className="text-2xl font-extrabold tracking-[-0.03em] text-text">
            {cpa > 0 ? `USD ${cpa.toFixed(2)}` : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
