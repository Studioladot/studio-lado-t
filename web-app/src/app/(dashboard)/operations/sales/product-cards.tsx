import type { ProductRanking } from '@/lib/tiendanube/orders'

function money(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

export function ProductCards({ ranking }: { ranking: ProductRanking }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-card border border-border bg-surface p-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Producto Estrella</p>
        {ranking.estrella.length === 0 ? (
          <p className="text-xs text-text-3">Sin ventas en el período.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ranking.estrella.map((p) => (
              <li
                key={p.variantId}
                className="flex items-center justify-between gap-3 rounded-control border border-border bg-surface-2/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-text">{p.name}</p>
                  <p className="text-[11px] text-text-3">
                    {p.unitsSold} u. — {money(p.revenue)}
                  </p>
                </div>
                <p className="shrink-0 tabular-nums text-xs font-semibold text-green">{money(p.margin)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-card border border-border bg-surface p-5">
        <div className="mb-0.5 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Productos Muertos</p>
          {ranking.totalTiedUpCapital > 0 && (
            <p className="tabular-nums text-xs font-semibold text-amber">{money(ranking.totalTiedUpCapital)} inmovilizados</p>
          )}
        </div>
        <p className="mb-3 text-[11px] text-text-3">Stock real sin rotación en el período — cruzado contra Tienda Nube.</p>

        {ranking.stockNotTracked ? (
          <p className="text-xs text-text-3">
            Tu tienda no usa el control de stock de Tienda Nube — activalo en el panel de Tienda Nube para ver inventario inmovilizado
            acá.
          </p>
        ) : ranking.muertos.length === 0 ? (
          <p className="text-xs text-text-3">Ninguno — todo lo que tiene stock cargado tuvo ventas en el período.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ranking.muertos.map((p) => (
              <li
                key={p.variantId}
                className="flex items-center justify-between gap-3 rounded-control border border-amber/20 bg-amber/[0.04] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-text">{p.name}</p>
                  <p className="text-[11px] text-text-3">{p.stock} u. sin rotación</p>
                </div>
                <span className="shrink-0 text-[11px] font-semibold text-amber">{p.hasCost ? money(p.tiedUpCapital) : 'Sin costo cargado'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
