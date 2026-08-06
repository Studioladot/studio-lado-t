'use client'

import { useMemo, useRef, useState } from 'react'
import { unifyContentItems, type UnifiedItem } from './unified-items'
import { rescheduleItemDateAction } from './actions'
import { getFechasComercialesAR } from '@/lib/content/efemerides'
import { QuickAddModal } from './quick-add-modal'
import { DayDetailModal } from './day-detail-modal'
import { ItemViewModal } from './item-view-modal'
import { PostForm } from './post-form'
import { PieceEditForm } from '../campaigns/[id]/piece-edit-form'
import type { Database } from '@/lib/types/database.types'
import type { MediaInsight } from './content-tabs'

type Post = Database['public']['Tables']['content_posts']['Row']
type Piece = Database['public']['Tables']['content_piezas']['Row']
type Campaign = Database['public']['Tables']['content_campaigns']['Row']

// Calendario Mensual — pilar que faltaba por completo en Fase 3 (nunca
// existió, ni como tab). Grilla de 7 columnas, misma convención semana-
// Lunes-primero que ya usa control-panel.tsx (startOfWeek).
//
// Drag & drop vía Pointer Events, no HTML5 draggable/dragstart/drop — la
// auditoría de cierre (2026-08-01) encontró que el DnD nativo no dispara en
// touch (mobile/tablet), solo con mouse. Pointer Events unifica mouse/touch/
// pen en la misma API sin librería nueva (mismo criterio "cero dependencias"
// de siempre) — el propio elemento captura el puntero (setPointerCapture),
// así que sigue recibiendo move/up aunque el dedo se mueva sobre otros
// elementos, y el día debajo del puntero se resuelve a mano con
// document.elementFromPoint + data-date en cada celda.
//
// 2026-07-31: click en un día abre DayDetailModal (ver/editar/borrar lo que
// ya hay ese día) — antes abría directo el formulario de alta, sin forma de
// ver ni borrar lo existente. "Crear" ahora es un botón propio en el header,
// separado de los días (antes solo se podía crear clickeando un día vacío).

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

const DRAG_THRESHOLD_PX = 6

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function buildMonthGrid(monthStart: Date): (Date | null)[] {
  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const primerLunes = firstDay === 0 ? 6 : firstDay - 1
  const diasEnMes = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < primerLunes; i++) cells.push(null)
  for (let d = 1; d <= diasEnMes; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function dateUnderPoint(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y)
  return el?.closest<HTMLElement>('[data-date]')?.dataset.date ?? null
}

function Pill({
  item,
  onTap,
  onDragMove,
  onDragEnd,
}: {
  item: UnifiedItem
  onTap: () => void
  onDragMove: (dateStr: string | null) => void
  onDragEnd: (dateStr: string | null) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const dragState = useRef<{ startX: number; startY: number; moved: boolean } | null>(null)

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = { startX: e.clientX, startY: e.clientY, moved: false }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const state = dragState.current
    if (!state) return
    if (!state.moved) {
      const dx = e.clientX - state.startX
      const dy = e.clientY - state.startY
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
      state.moved = true
      setIsDragging(true)
    }
    onDragMove(dateUnderPoint(e.clientX, e.clientY))
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const state = dragState.current
    dragState.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)

    if (!state?.moved) {
      onTap()
      return
    }
    setIsDragging(false)
    onDragEnd(dateUnderPoint(e.clientX, e.clientY))
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLButtonElement>) {
    dragState.current = null
    setIsDragging(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    onDragEnd(null)
  }

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={(e) => e.stopPropagation()}
      style={{ borderColor: item.source === 'campana' ? item.campaignColor : 'var(--border)', touchAction: 'none' }}
      className={`flex w-full items-center gap-1 rounded-control border px-1 py-0.5 text-left text-[9px] font-medium transition-colors duration-150 ease-out hover:bg-surface-2 sm:px-1.5 sm:py-1 sm:text-[10px] ${
        isDragging ? 'opacity-40' : ''
      }`}
      title={item.titulo}
    >
      <span className="truncate text-text">{item.titulo || 'Sin título'}</span>
    </button>
  )
}

export function ContentCalendar({
  posts,
  pieces,
  campaigns,
  instagramConnected,
  tiktokConnected,
  mediaInsights,
}: {
  posts: Post[]
  pieces: Piece[]
  campaigns: Campaign[]
  instagramConnected: boolean
  tiktokConnected: boolean
  mediaInsights: MediaInsight[]
}) {
  const [monthStart, setMonthStart] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [viewingDate, setViewingDate] = useState<string | null>(null)
  const [addDate, setAddDate] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<UnifiedItem | null>(null)
  const [viewingItem, setViewingItem] = useState<UnifiedItem | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  const items = useMemo(() => unifyContentItems(posts, pieces, campaigns), [posts, pieces, campaigns])

  const itemsByDate = useMemo(() => {
    const map = new Map<string, UnifiedItem[]>()
    for (const item of items) {
      if (!item.date) continue
      const list = map.get(item.date) ?? []
      list.push(item)
      map.set(item.date, list)
    }
    return map
  }, [items])

  const cells = useMemo(() => buildMonthGrid(monthStart), [monthStart])

  // Efemérides comerciales (2026-08-05) — estáticas, sin tocar la base
  // (ver src/lib/content/efemerides.ts). Solo depende del año del mes que
  // se está mirando, cada celda del grid ya pertenece a ese mes/año.
  const efemeridesByDate = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of getFechasComercialesAR(monthStart.getFullYear())) map.set(f.date, f.nombre)
    return map
  }, [monthStart])
  const monthLabelRaw = monthStart.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1)
  const todayStr = toDateStr(new Date())

  const editingPost = editingItem?.sourceTable === 'content_posts' ? posts.find((p) => p.id === editingItem.id) : undefined
  const editingPiece = editingItem?.sourceTable === 'content_piezas' ? pieces.find((p) => p.id === editingItem.id) : undefined

  function handleItemDragEnd(item: UnifiedItem, dateStr: string | null) {
    setDragOverDate(null)
    if (!dateStr || dateStr === item.date) return
    rescheduleItemDateAction(item.sourceTable, item.id, dateStr)
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonthStart((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            aria-label="Mes anterior"
            className="flex h-7 w-7 items-center justify-center rounded-control border border-border text-text-2 transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
          >
            ‹
          </button>
          <p className="min-w-[120px] text-center text-sm font-bold text-text sm:min-w-[140px]">{monthLabel}</p>
          <button
            type="button"
            onClick={() => setMonthStart((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            aria-label="Mes siguiente"
            className="flex h-7 w-7 items-center justify-center rounded-control border border-border text-text-2 transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date()
              setMonthStart(new Date(now.getFullYear(), now.getMonth(), 1))
            }}
            className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
          >
            Hoy
          </button>
        </div>

        {/* Botón de creación separado a propósito — antes la única forma de
            cargar algo era clickear un día vacío, mezclado con "ver lo que
            hay". Usa la fecha de hoy por default, el usuario la cambia en
            el formulario si hace falta. */}
        <button
          type="button"
          onClick={() => setAddDate(todayStr)}
          className="rounded-control bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
        >
          + Nueva publicación
        </button>
      </div>

      <div className="overflow-hidden rounded-card border border-border">
        <div className="grid grid-cols-7 bg-surface-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-1 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-text-3 sm:px-2 sm:text-[10px]">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="min-h-[70px] border-b border-r border-divider bg-surface-2/20 last:border-r-0 sm:min-h-[96px]" />
            const dateStr = toDateStr(date)
            const dayItems = itemsByDate.get(dateStr) ?? []
            const isToday = dateStr === todayStr
            const isDragOver = dragOverDate === dateStr
            const efemeride = efemeridesByDate.get(dateStr)

            return (
              <div
                key={i}
                data-date={dateStr}
                onClick={() => setViewingDate(dateStr)}
                className={`flex min-h-[70px] cursor-pointer flex-col gap-1 border-b border-r border-divider p-1 transition-colors duration-150 ease-out last:border-r-0 hover:bg-surface-2/40 sm:min-h-[96px] sm:p-1.5 ${
                  isDragOver ? 'bg-accent/8' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`w-fit rounded-full px-1.5 text-[9px] font-bold tabular-nums sm:text-[10px] ${isToday ? 'bg-accent text-white' : 'text-text-3'}`}>
                    {date.getDate()}
                  </span>
                  {efemeride && (
                    <span
                      title={efemeride}
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber"
                      aria-label={efemeride}
                    />
                  )}
                </div>
                {efemeride && (
                  <span className="truncate text-[8px] font-medium leading-none text-amber sm:text-[9px]" title={efemeride}>
                    {efemeride}
                  </span>
                )}
                <div className="flex flex-col gap-1">
                  {dayItems.slice(0, 2).map((item) => (
                    <Pill
                      key={`${item.sourceTable}-${item.id}`}
                      item={item}
                      onTap={() => setViewingDate(dateStr)}
                      onDragMove={setDragOverDate}
                      onDragEnd={(targetDate) => handleItemDragEnd(item, targetDate)}
                    />
                  ))}
                  {dayItems.length > 2 && <span className="px-1 text-[9px] text-text-3 sm:text-[10px]">+{dayItems.length - 2} más</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {viewingDate && (
        <DayDetailModal
          date={viewingDate}
          items={itemsByDate.get(viewingDate) ?? []}
          onClose={() => setViewingDate(null)}
          onView={(item) => {
            setViewingDate(null)
            setViewingItem(item)
          }}
          onEdit={(item) => {
            setViewingDate(null)
            setEditingItem(item)
          }}
          onAddForDate={(date) => {
            setViewingDate(null)
            setAddDate(date)
          }}
        />
      )}

      {viewingItem && <ItemViewModal item={viewingItem} mediaInsights={mediaInsights} onClose={() => setViewingItem(null)} />}

      {addDate && (
        <QuickAddModal
          date={addDate}
          campaigns={campaigns}
          instagramConnected={instagramConnected}
          tiktokConnected={tiktokConnected}
          onClose={() => setAddDate(null)}
        />
      )}

      {editingItem && (editingPost || editingPiece) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditingItem(null)}>
          <div className="max-h-[85vh] w-full max-w-[480px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {editingPost && (
              <PostForm post={editingPost} instagramConnected={instagramConnected} tiktokConnected={tiktokConnected} onDone={() => setEditingItem(null)} />
            )}
            {editingPiece && (
              <div className="rounded-card border border-border bg-surface p-4">
                <PieceEditForm
                  piece={editingPiece}
                  campaignId={editingPiece.campaign_id}
                  instagramConnected={instagramConnected}
                  tiktokConnected={tiktokConnected}
                  onSaved={() => setEditingItem(null)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
