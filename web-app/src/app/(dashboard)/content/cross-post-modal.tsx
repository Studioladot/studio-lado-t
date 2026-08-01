'use client'

import { useState } from 'react'
import Link from 'next/link'
import { crossPostAction } from './cross-post-actions'
import type { WinningItem } from '@/lib/content/winners'

// "Resubir a [Otra Plataforma]" (Épica Omnicanal, 2026-08-04) — clona el
// Archivo Final del ganador en una publicación suelta nueva para la red
// contraria, lista en 'listo_para_programar'. No publica nada directo: el
// usuario termina de ajustar copy/horario en Publicaciones antes de
// guardarla de verdad.

const PLATFORM_LABEL: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok' }

export function CrossPostModal({ item, onClose }: { item: WinningItem; onClose: () => void }) {
  const otherPlatform = item.platform === 'tiktok' ? 'instagram' : 'tiktok'
  const [target, setTarget] = useState<'instagram' | 'tiktok'>(otherPlatform)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    setPending(true)
    setError(null)
    const result = await crossPostAction(item.sourceTable, item.itemId, target)
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-card border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-text">Resubir a otra plataforma</p>
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

        {done ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-2">
              Listo — se creó un borrador para {PLATFORM_LABEL[target]} con el mismo Archivo Final de &ldquo;{item.title}&rdquo;. Terminá de ajustar el
              copy y el horario en Publicaciones antes de programarla.
            </p>
            <Link
              href="/content"
              className="w-fit rounded-control bg-primary px-3.5 py-2 text-xs font-bold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
            >
              Ir a Publicaciones
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-2">
              &ldquo;{item.title}&rdquo; viene creciendo fuerte en {PLATFORM_LABEL[item.platform] ?? item.platform} (+
              {item.growthPct.toFixed(0)}% vs. la captura anterior). Cloná el mismo Archivo Final para la otra red.
            </p>
            <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">
              Resubir a
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as 'instagram' | 'tiktok')}
                className="rounded-control border border-border bg-surface-2/60 px-3 py-2.5 text-sm normal-case tracking-normal text-text outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
              </select>
            </label>
            {error && <p className="text-xs text-red">{error}</p>}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="w-fit rounded-control bg-primary px-3.5 py-2 text-xs font-bold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? 'Creando…' : 'Crear borrador'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
