'use client'

import { createPortal } from 'react-dom'
import { useState, type FormEvent } from 'react'
import { updateLibraryCreativeAction } from './actions'
import type { LibraryCreative } from '@/lib/meta/library'

// Editar Título/Copy/Hook sin borrar y resubir el archivo (2026-07-27).
// Mismo patrón de portal que convert-to-ad-modal.tsx/order-detail-modal.tsx.
// El archivo no es editable acá a propósito — si cambia el archivo es un
// creativo nuevo, mismo criterio que el resto de la Biblioteca.

const FIELD_CLASS =
  'rounded-control border border-border bg-surface-2/60 px-3 py-2 text-sm text-text outline-none transition-all duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent'
const labelClass = 'flex flex-col gap-1.5 text-xs font-medium text-text-2'

export function EditCreativeModal({ creative, onClose, onDone }: { creative: LibraryCreative | null; onClose: () => void; onDone: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!creative) return null

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!creative) return
    setError(null)

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const headline = (form.elements.namedItem('headline') as HTMLInputElement).value.trim() || null
    const primaryText = (form.elements.namedItem('primary_text') as HTMLTextAreaElement).value.trim() || null

    setSaving(true)
    const result = await updateLibraryCreativeAction(creative.id, { name, headline, primaryText })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onDone()
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-[520px] max-w-full flex-col rounded-card border border-border bg-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Biblioteca de Ads</p>
            <h2 className="mt-0.5 text-[17px] font-bold tracking-[-0.02em] text-text">Editar creativo</h2>
            <p className="mt-1 text-xs text-text-2">El archivo no se puede cambiar acá — solo texto.</p>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto px-6 py-5">
          <label className={labelClass}>
            Nombre interno
            <input name="name" type="text" required defaultValue={creative.name} className={FIELD_CLASS} />
          </label>
          <label className={labelClass}>
            Título (Hook)
            <input name="headline" type="text" defaultValue={creative.headline ?? ''} className={FIELD_CLASS} />
          </label>
          <label className={labelClass}>
            Texto principal (Copy)
            <textarea name="primary_text" rows={4} defaultValue={creative.primaryText ?? ''} className={`resize-none ${FIELD_CLASS}`} />
          </label>

          {error && <p className="text-xs text-red">{error}</p>}

          <div className="mt-2 flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-control bg-primary px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
