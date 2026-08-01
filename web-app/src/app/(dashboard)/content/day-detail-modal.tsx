'use client'

import { deletePostAction } from './actions'
import { deletePieceAction } from '../campaigns/[id]/actions'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { isOverdueScheduled, type UnifiedItem } from './unified-items'

// Modal de "qué hay programado este día" — antes, clickear un día del
// Calendario abría directo el formulario de alta, sin forma de ver/editar/
// borrar lo que ya estaba cargado ese día. Ahora el click en el día abre
// esto; crear queda en un botón aparte (ver ContentCalendar) para no
// mezclar "ver lo que hay" con "cargar algo nuevo".

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Programado', className: 'border-accent/40 bg-accent/[8%] text-accent' },
  publishing: { label: 'Publicando…', className: 'border-amber/40 bg-amber/[8%] text-amber' },
  published: { label: 'Publicado', className: 'border-green/40 bg-green/[8%] text-green' },
  failed: { label: 'Error', className: 'border-red/40 bg-red/[8%] text-red' },
}

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
                const overdue = isOverdueScheduled(item)
                const badge = STATUS_BADGE[item.publishStatus]
                return (
                  <div key={`${item.sourceTable}-${item.id}`} className="rounded-control border border-border bg-surface-2/40 p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="min-w-0 flex-1 truncate text-xs font-semibold text-text">{item.titulo || 'Sin título'}</p>
                      {badge && (
                        <span
                          title={overdue ? 'Pasó la hora programada y todavía no se publicó — puede ser el límite diario de Instagram (25 posts/24h) u otro problema de conexión.' : undefined}
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${overdue ? 'border-red/40 bg-red/[8%] text-red' : badge.className}`}
                        >
                          {overdue ? 'Demorado' : badge.label}
                        </span>
                      )}
                    </div>
                    {item.source === 'campana' && (
                      <p className="mt-0.5 text-[10px]" style={{ color: item.campaignColor }}>
                        {item.campaignName}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-[11px]">
                      {/* "Ver" — vista de solo lectura (copy completo, notas
                          internas, preview del archivo, métricas), pedida
                          explícitamente por la PO para no arriesgar cambiar
                          datos por accidente al querer solo revisar algo.
                          Distinto del link "Ver en Instagram", que manda al
                          post real y solo existe una vez publicado. */}
                      <button type="button" onClick={() => onView(item)} className="font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text">
                        Ver
                      </button>
                      {item.igPermalink && (
                        <a href={item.igPermalink} target="_blank" rel="noreferrer" className="font-medium text-green transition-colors duration-200 ease-out hover:text-green/80">
                          Ver en Instagram ↗
                        </a>
                      )}
                      <button type="button" onClick={() => onEdit(item)} className="font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text">
                        Editar
                      </button>
                      {/* Auditoría de cierre: borrar algo 'publishing' no cancela la publicación real en Instagram, solo pierde el registro local. */}
                      {item.publishStatus !== 'publishing' &&
                        (item.sourceTable === 'content_posts' ? (
                          <form action={deletePostAction.bind(null, item.id)} className="ml-auto">
                            <ConfirmSubmitButton
                              confirmMessage={`¿Estás seguro? Se va a borrar "${item.titulo}".`}
                              className="font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                            >
                              Eliminar
                            </ConfirmSubmitButton>
                          </form>
                        ) : (
                          item.campaignId && (
                            <form action={deletePieceAction.bind(null, item.id, item.campaignId)} className="ml-auto">
                              <ConfirmSubmitButton
                                confirmMessage={`¿Estás seguro? Se va a borrar "${item.titulo}".`}
                                className="font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                              >
                                Eliminar
                              </ConfirmSubmitButton>
                            </form>
                          )
                        ))}
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
