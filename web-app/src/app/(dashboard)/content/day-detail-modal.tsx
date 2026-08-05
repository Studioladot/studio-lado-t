'use client'

import { deletePostAction } from './actions'
import { deletePieceAction } from '../campaigns/[id]/actions'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { pillClass } from '@/components/features/action-pill'
import type { UnifiedItem } from './unified-items'

// Modal de "qué hay planificado este día" — antes, clickear un día del
// Calendario abría directo el formulario de alta, sin forma de ver/editar/
// borrar lo que ya estaba cargado ese día. Ahora el click en el día abre
// esto; crear queda en un botón aparte (ver ContentCalendar) para no
// mezclar "ver lo que hay" con "cargar algo nuevo".

export function DayDetailModal({
  date,
  items,
  onClose,
  onView,
  onEdit,
  onAddForDate,
}: {
  date: string
  items: UnifiedItem[]
  onClose: () => void
  onView: (item: UnifiedItem) => void
  onEdit: (item: UnifiedItem) => void
  onAddForDate: (date: string) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-card border border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <p className="text-sm font-bold tabular-nums text-text">{date}</p>
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
            <p className="text-center text-xs text-text-3">Sin publicaciones este día.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {items.map((item) => {
                return (
                  <div key={`${item.sourceTable}-${item.id}`} className="rounded-control border border-border bg-surface-2/40 p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="min-w-0 flex-1 truncate text-xs font-semibold text-text">{item.titulo || 'Sin título'}</p>
                    </div>
                    {item.source === 'campana' && (
                      <p className="mt-0.5 text-[10px]" style={{ color: item.campaignColor }}>
                        {item.campaignName}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {/* "Ver" — vista de solo lectura (copy completo, notas
                          internas, preview de referencias), pedida
                          explícitamente por la PO para no arriesgar cambiar
                          datos por accidente al querer solo revisar algo. */}
                      <button type="button" onClick={() => onView(item)} className={pillClass('neutral')}>
                        Ver
                      </button>
                      <button type="button" onClick={() => onEdit(item)} className={pillClass('neutral')}>
                        Editar
                      </button>
                      {item.sourceTable === 'content_posts' ? (
                        <form action={deletePostAction.bind(null, item.id)} className="ml-auto">
                          <ConfirmSubmitButton
                            confirmMessage={`¿Estás seguro? Se va a borrar "${item.titulo}".`}
                            toastPending="Borrando…"
                            toastSuccess="Eliminado con éxito"
                          >
                            Eliminar
                          </ConfirmSubmitButton>
                        </form>
                      ) : (
                        item.campaignId && (
                          <form action={deletePieceAction.bind(null, item.id, item.campaignId)} className="ml-auto">
                            <ConfirmSubmitButton
                              confirmMessage={`¿Estás seguro? Se va a borrar "${item.titulo}".`}
                              toastPending="Borrando…"
                              toastSuccess="Eliminado con éxito"
                            >
                              Eliminar
                            </ConfirmSubmitButton>
                          </form>
                        )
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-5 py-3.5">
          <button
            type="button"
            onClick={() => onAddForDate(date)}
            className="w-full rounded-control border border-primary/25 bg-transparent px-4 py-2 text-xs font-semibold text-primary transition-all duration-200 ease-out hover:bg-primary/[6%] active:scale-[0.98]"
          >
            + Agregar publicación para este día
          </button>
        </div>
      </div>
    </div>
  )
}
