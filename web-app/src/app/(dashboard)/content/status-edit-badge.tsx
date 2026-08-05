'use client'

import { useState } from 'react'
import { togglePostStatusAction } from './actions'
import { togglePieceStatusAction } from '../campaigns/[id]/actions'
import { DropdownMenu, DropdownItem } from '@/components/features/dropdown-menu'
import { MiniSpinner } from '@/components/features/action-pill'
import { useToast } from '@/components/features/toast'
import type { UnifiedItem } from './unified-items'

// Edición rápida de Estado (pulido UX/UI, 2026-08-06) — clickear el badge
// de la tabla de Publicaciones cambia el estado al instante, sin abrir el
// formulario de edición completo. content_posts soporta 3 valores
// (pendiente/borrador/publicado); content_piezas solo 2 — el mismo
// componente se adapta según `item.sourceTable` en vez de duplicarse.

const POST_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'publicado', label: 'Publicado' },
]

const PIECE_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'publicado', label: 'Publicado' },
]

const BADGE_CLASS: Record<string, string> = {
  publicado: 'border-green/40 bg-green/[8%] text-green',
  pendiente: 'border-amber/40 bg-amber/[8%] text-amber',
  borrador: 'border-border text-text-2',
}

export function StatusEditBadge({ item }: { item: UnifiedItem }) {
  const [pending, setPending] = useState(false)
  const toast = useToast()

  const options = item.sourceTable === 'content_posts' ? POST_OPTIONS : PIECE_OPTIONS
  const badgeClass = BADGE_CLASS[item.status] ?? 'border-border text-text-2'
  const currentLabel = options.find((o) => o.value === item.status)?.label ?? item.status

  async function handleSelect(next: string, close: () => void) {
    close()
    if (next === item.status || pending) return

    setPending(true)
    const toastId = toast.show('Actualizando estado…', 'pending')
    try {
      if (item.sourceTable === 'content_posts') {
        await togglePostStatusAction(item.id, next)
      } else if (item.campaignId) {
        await togglePieceStatusAction(item.id, item.campaignId, next)
      }
      toast.update(toastId, 'Estado actualizado', 'success')
    } catch (err) {
      console.error('[StatusEditBadge] excepción al actualizar el estado:', err)
      toast.update(toastId, 'No pudimos actualizar el estado', 'error')
    } finally {
      setPending(false)
    }
  }

  return (
    <DropdownMenu
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize transition-all duration-150 ease-out hover:brightness-95 disabled:cursor-wait disabled:opacity-70 ${badgeClass} ${
            open ? 'ring-2 ring-accent/30' : ''
          }`}
        >
          {pending && <MiniSpinner />}
          {currentLabel}
          {!pending && (
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
              <path d="M2 3.5 5 6.5 8 3.5" />
            </svg>
          )}
        </button>
      )}
    >
      {(close) => (
        <>
          {options.map((opt) => (
            <DropdownItem key={opt.value} active={opt.value === item.status} onClick={() => handleSelect(opt.value, close)}>
              {opt.label}
            </DropdownItem>
          ))}
        </>
      )}
    </DropdownMenu>
  )
}
