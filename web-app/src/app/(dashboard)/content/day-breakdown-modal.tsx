'use client'

import type { UnifiedItem } from './unified-items'

// Detalle de un día dentro del widget "Últimos 7 días" de Control —
// deliberadamente de solo lectura (a diferencia de DayDetailModal, que ya
// vive en el Calendario con acciones Ver/Editar/Borrar completas): acá el
// pedido puntual era "qué se subió y qué faltó subir", no reabrir los
// formularios de edición dentro de la pestaña Control.

export function DayBreakdownModal({ date, items, onClose }: { date: string; items: UnifiedItem[]; onClose: () => void }) {
  const published = items.filter((i) => i.status === 'publicado')
  const pending = items.filter((i) => i.status !== 'publicado')
  const label = new Date(`${date}T00:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-[420px] flex-col overflow-hidden rounded-card border border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <p className="text-sm font-bold capitalize text-text">{label}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-control text-text-3 transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="text-center text-xs text-text-3">No había nada planificado este día.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {published.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-green">Subido ({published.length})</p>
                  <div className="flex flex-col gap-1.5">
                    {published.map((item) => (
                      <div key={`${item.sourceTable}-${item.id}`} className="rounded-control border border-border bg-surface-2/40 px-3 py-2">
                        <p className="truncate text-xs font-semibold text-text">{item.titulo || 'Sin título'}</p>
                        <p className="mt-0.5 text-[10px] text-text-3">{[item.platform, item.format].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pending.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-amber">Faltó subir ({pending.length})</p>
                  <div className="flex flex-col gap-1.5">
                    {pending.map((item) => (
                      <div key={`${item.sourceTable}-${item.id}`} className="rounded-control border border-dashed border-amber/30 bg-amber/4 px-3 py-2">
                        <p className="truncate text-xs font-semibold text-text">{item.titulo || 'Sin título'}</p>
                        <p className="mt-0.5 text-[10px] text-text-3">{[item.platform, item.format].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
