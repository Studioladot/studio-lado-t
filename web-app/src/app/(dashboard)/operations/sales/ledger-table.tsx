'use client'

import { useState } from 'react'
import { Pagination } from '../../meta-ads/campaigns/pagination'
import { OrderDetailModal } from './order-detail-modal'
import type { OrderLedgerEntry } from '@/lib/tiendanube/orders'

// Ventas del Período — Ledger Neto. "Ver detalle" abre la Radiografía de la
// Orden (order-detail-modal.tsx) con el desglose línea por línea; acá solo
// van las columnas resumen. Paginado con el mismo componente genérico que ya
// usa la tabla de campañas (meta-ads/campaigns/pagination.tsx) — sin estado
// propio, cero lógica nueva de paginación que mantener en dos lugares.

const PAGE_SIZE = 10

function money(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

// Tienda Nube ya filtra a solo órdenes pagas (ver getTiendaNubeOrders) — lo
// que queda en `status` es el estado de cumplimiento, no de pago.
const STATUS_LABELS: Record<string, string> = {
  open: 'En proceso',
  closed: 'Completada',
}

export function LedgerTable({ ledger }: { ledger: OrderLedgerEntry[] }) {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<OrderLedgerEntry | null>(null)

  const totalPages = Math.max(1, Math.ceil(ledger.length / PAGE_SIZE))
  const rows = ledger.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-text-3">Ventas del Período — Ledger Neto</p>
      <p className="mb-3 text-[11px] text-text-3">
        &ldquo;Total Neto&rdquo; ya incluye el costo publicitario prorrateado (spend total de Meta / órdenes del período) — abrí &ldquo;Ver
        detalle&rdquo; para el desglose completo por orden.
      </p>

      {ledger.length === 0 ? (
        <p className="text-center text-xs text-text-3">Sin órdenes en el período.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-control border border-border">
            <table className="w-full text-xs">
              <thead className="bg-surface-2">
                <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-text-3">
                  <th className="px-3 py-2">ID Orden</th>
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2 text-right">Total Orden</th>
                  <th className="px-3 py-2 text-right">Total Neto</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.orderId} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-text">#{e.orderId}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">Tienda Online</span>
                    </td>
                    <td className="px-3 py-2 text-text-2">{STATUS_LABELS[e.status ?? ''] ?? e.status ?? 'Pagada'}</td>
                    <td className="px-3 py-2 text-text-3">{e.createdAt.split('T')[0]}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text">{money(e.bruto)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${e.neto >= 0 ? 'text-green' : 'text-red'}`}>
                      {money(e.neto)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(e)}
                        className="rounded-control border border-accent/30 bg-accent/[0.06] px-2.5 py-1 text-[10px] font-semibold text-accent transition-all duration-200 ease-out hover:bg-accent/[0.12]"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <OrderDetailModal entry={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
