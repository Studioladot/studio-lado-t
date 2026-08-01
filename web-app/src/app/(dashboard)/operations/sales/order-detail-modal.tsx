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

const LINES: {
  key: 'cogs' | 'envio' | 'impuestos' | 'comisionTn' | 'comisionPasarela' | 'adsProrated' | 'opexProrated'
  label: string
}[] = [
  { key: 'cogs', label: 'Costo de productos' },
  { key: 'envio', label: 'Costo de envío' },
  { key: 'impuestos', label: 'Impuestos' },
  { key: 'comisionTn', label: 'Comisión Tienda Nube' },
  { key: 'comisionPasarela', label: 'Comisión pasarela' },
  { key: 'adsProrated', label: 'Costo publicitario (CPA prorrateado)' },
  { key: 'opexProrated', label: 'Costos Fijos (OpEx prorrateado)' },
]

export function OrderDetailModal({ entry, onClose }: { entry: OrderLedgerEntry | null; onClose: () => void }) {
  if (!entry) return null

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] max-w-full rounded-card border border-border bg-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Radiografía de la Orden</p>
            <h2 className="mt-0.5 text-[17px] font-bold tracking-[-0.02em] text-text">Orden #{entry.orderId}</h2>
            <p className="mt-0.5 text-xs text-text-3">{entry.createdAt.split('T')[0]}</p>
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
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-text-2">Total orden</span>
            <span className="tabular-nums font-semibold text-text">{money(entry.bruto)}</span>
          </div>
          {LINES.map((line) => (
            <div key={line.key} className="flex items-center justify-between text-sm">
              <span className="text-text-2">{line.label}</span>
              <span className="tabular-nums text-red">−{money(entry[line.key])}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-b-card border-t border-accent/30 bg-accent/[0.06] px-6 py-4">
          <span className="text-sm font-bold text-text">Neto real</span>
          <span className="tabular-nums text-lg font-bold text-accent">{money(entry.neto)}</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
