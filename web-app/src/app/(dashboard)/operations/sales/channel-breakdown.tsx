import type { ChannelSummary } from '@/lib/tiendanube/payment-fees'

// Lo que te queda por medio de pago (2026-11-12) — cuánto se cobró por cada
// forma de pago, cuánto se fue en comisiones y retenciones, y cuánto llega
// a la cuenta. Antes de envío, costo de producto y publicidad (eso está en
// la cascada).

function money(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

export function ChannelBreakdown({
  channels,
  faltantes,
  onConfigure,
}: {
  channels: ChannelSummary[]
  faltantes: string[]
  onConfigure: () => void
}) {
  if (channels.length === 0) return null

  const total = channels.reduce(
    (acc, c) => ({
      ordenes: acc.ordenes + c.ordenes,
      facturacion: acc.facturacion + c.facturacion,
      comisiones: acc.comisiones + c.comisiones,
      retenciones: acc.retenciones + c.retenciones,
      teDepositan: acc.teDepositan + c.teDepositan,
    }),
    { ordenes: 0, facturacion: 0, comisiones: 0, retenciones: 0, teDepositan: 0 }
  )
  const totalQueda = total.facturacion > 0 ? (total.teDepositan / total.facturacion) * 100 : 0

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Lo que te queda por medio de pago</p>
          <p className="mt-0.5 max-w-[640px] text-[11px] leading-relaxed text-text-3">
            Cuánto cobraste de cada forma, cuánto se llevaron Pago Nube y Tienda Nube (comisión, cuotas e IVA) y cuánto te depositan.
            Todavía sin restar envío, productos ni publicidad.
          </p>
        </div>
        <button
          type="button"
          onClick={onConfigure}
          className="shrink-0 text-xs font-semibold text-accent transition-colors duration-200 ease-out hover:text-accent/80"
        >
          Cómo cobrás →
        </button>
      </div>

      {faltantes.length > 0 && (
        <p className="mb-3 rounded-control border border-amber/30 bg-amber/[6%] px-3 py-2 text-[11px] text-amber">
          Para que las comisiones sean exactas falta confirmar {faltantes.join(', ').replace(/, ([^,]*)$/, ' y $1')} en Cómo cobrás.
        </p>
      )}

      <div className="overflow-x-auto rounded-control border border-border">
        <table className="w-full text-xs">
          <thead className="bg-surface-2">
            <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-text-3">
              <th className="px-3 py-2">Medio de pago</th>
              <th className="px-3 py-2 text-right">Órdenes</th>
              <th className="px-3 py-2 text-right">Cobrado</th>
              <th className="px-3 py-2 text-right">Comisiones</th>
              <th className="px-3 py-2 text-right">Retenciones</th>
              <th className="px-3 py-2 text-right">Te depositan</th>
              <th className="px-3 py-2 text-right">Te queda</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c.channel} className="border-t border-border">
                <td className="px-3 py-2 font-medium text-text">{c.label}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text-2">{c.ordenes}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text">{money(c.facturacion)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-red">
                  {c.comisiones > 0 ? `−${money(c.comisiones)}` : '$0'}
                  <span className="ml-1 text-[10px] text-text-3">({c.comisionPct.toFixed(1)}%)</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text-2">{c.retenciones > 0 ? `−${money(c.retenciones)}` : '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-text">{money(c.teDepositan)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-green">{c.quedaPct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
          {channels.length > 1 && (
            <tfoot>
              <tr className="border-t border-border-2 bg-surface-2/50 font-semibold">
                <td className="px-3 py-2 text-text">Total</td>
                <td className="px-3 py-2 text-right tabular-nums text-text-2">{total.ordenes}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text">{money(total.facturacion)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-red">−{money(total.comisiones)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text-2">{total.retenciones > 0 ? `−${money(total.retenciones)}` : '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text">{money(total.teDepositan)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-green">{totalQueda.toFixed(1)}%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
