'use client'

import { createPortal } from 'react-dom'
import type { OrderLedgerEntry } from '@/lib/tiendanube/orders'

// Radiografía de la Orden (2026-07-27) — desglose línea por línea, mismo
// patrón de portal que unit-economics-modal.tsx (createPortal a document.body:
// si esto se abre desde una fila dentro de una tabla con overflow, un
// ancestro con stacking context propio corta el modal a la mitad — ver nota
// en memoria sobre el mismo bug ya resuelto en AutopilotPanel).

function money(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

function Line({ label, value, help, strong }: { label: string; value: number; help?: string; strong?: boolean }) {
  if (value === 0 && !strong) return null
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className={strong ? 'font-semibold text-text' : 'text-text-2'}>
        {label}
        {help && <span className="block text-[11px] text-text-3">{help}</span>}
      </span>
      <span className={`shrink-0 tabular-nums ${strong ? 'font-semibold text-text' : value < 0 ? 'text-red' : 'text-text'}`}>
        {value < 0 ? '−' : ''}
        {money(Math.abs(value))}
      </span>
    </div>
  )
}

export function OrderDetailModal({ entry, onClose }: { entry: OrderLedgerEntry | null; onClose: () => void }) {
  if (!entry) return null
  const teDepositan = entry.bruto - entry.comisionPasarela - entry.comisionTn - entry.retenciones

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] max-w-full rounded-card border border-border bg-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Radiografía de la Orden</p>
            <h2 className="mt-0.5 text-[17px] font-bold tracking-[-0.02em] text-text">Orden #{entry.orderNumber ?? entry.orderId}</h2>
            <p className="mt-0.5 text-xs text-text-3">
              {entry.day} · {entry.medio}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-text-3 outline-none transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2.5 px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Lo que te depositan</p>
          <Line label="Total cobrado" value={entry.bruto} strong />
          <Line label="Comisiones de cobro" help="Pago Nube, cuotas sin interés e IVA" value={-entry.comisionPasarela} />
          <Line label="Tienda Nube por venta" help="Costo por transacción de tu plan" value={-entry.comisionTn} />
          <Line label="Retenciones de Ingresos Brutos" help="A cuenta del impuesto" value={-entry.retenciones} />
          <div className="border-t border-divider pt-2.5">
            <Line label="Te depositan" value={teDepositan} strong />
          </div>

          <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Lo que te queda</p>
          <Line label="Costo de envío" help="Lo que te cobra el correo" value={-entry.envio} />
          <Line label="Costo de productos" value={-entry.cogs} />
          <Line
            label="Impuestos (después de las retenciones)"
            help="Tu % de impuestos menos lo que ya te retuvieron"
            value={-(entry.impuestos - entry.retenciones)}
          />
          <Line label="Publicidad" help="Gasto de Meta del período repartido entre las órdenes" value={-entry.adsProrated} />
          <Line label="Costos fijos" help="Repartidos entre las órdenes del período" value={-entry.opexProrated} />
        </div>

        <div className="flex items-center justify-between rounded-b-card border-t border-accent/30 bg-accent/[0.06] px-6 py-4">
          <span className="text-sm font-bold text-text">Te queda (neto real)</span>
          <span className="tabular-nums text-lg font-bold text-accent">{money(entry.neto)}</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
