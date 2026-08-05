'use client'

import { useActionState, useEffect, useState } from 'react'
import { updatePieceAction, type UpdatePieceState } from './actions'
import { useFormStatusToast } from '@/components/features/use-form-status-toast'
import { MiniSpinner } from '@/components/features/action-pill'
import { useToast } from '@/components/features/toast'
import type { Database } from '@/lib/types/database.types'

type Piece = Database['public']['Tables']['content_piezas']['Row']

const FORMATOS = ['Reel', 'TikTok', 'Carrusel', 'Historia', 'Post', 'Video largo', 'Otro']
const PLATAFORMAS = ['Instagram', 'TikTok', 'Ambas', 'YouTube']
const TURNOS = ['Temprano', 'Tarde', 'Noche']
// Ver post-form.tsx (Épica Omnicanal, 2026-08-04).
const PRODUCTION_STATUSES = [
  { value: 'idea', label: 'Idea' },
  { value: 'por_grabar', label: 'Por grabar' },
  { value: 'listo_para_programar', label: 'Listo para publicar' },
  { value: 'programado', label: 'Programado' },
  { value: 'publicado', label: 'Publicado' },
]

const initialState: UpdatePieceState = { error: null, success: false }

// Mismo fix que add-piece-form.tsx: colores theme-aware, antes hardcodeados
// a hex claro (se rompía en dark mode).
const fieldClass =
  'rounded-control border border-border bg-surface-2/60 px-3 py-2.5 text-sm text-text outline-none transition-all duration-200 ease-out placeholder:text-text-3 focus:border-accent focus-visible:ring-2 focus-visible:ring-accent'

const labelClass = 'flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

function SaveButton() {
  // No dispara el toast de éxito acá — updatePieceAction no redirige y
  // `state.success` (más abajo) es una señal más confiable que la
  // transición de `pending`, que en algún caso podría coincidir con un
  // `error` sin success real.
  const pending = useFormStatusToast('Guardando…')

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
    >
      {pending && <MiniSpinner />}
      {pending ? 'Guardando…' : 'Guardar'}
    </button>
  )
}

export function PieceEditForm({
  piece,
  campaignId,
  instagramConnected,
  tiktokConnected,
  onSaved,
}: {
  piece: Piece
  campaignId: string
  instagramConnected: boolean
  tiktokConnected: boolean
  onSaved: () => void
}) {
  const boundAction = updatePieceAction.bind(null, piece.id, campaignId)
  const [state, formAction] = useActionState(boundAction, initialState)
  const [networkTab, setNetworkTab] = useState<'instagram' | 'tiktok'>('instagram')
  const toast = useToast()

  useEffect(() => {
    if (state.success) {
      toast.show('Guardado con éxito', 'success')
      onSaved()
    }
  }, [state.success, onSaved, toast])

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-3">
      <label className={labelClass}>
        Título
        <input
          name="titulo"
          type="text"
          required
          defaultValue={piece.titulo}
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Estado de Producción
          <select name="production_status" defaultValue={piece.production_status ?? 'idea'} className={`normal-case tracking-normal ${fieldClass}`}>
            {PRODUCTION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Formato
          <select
            name="formato"
            defaultValue={piece.formato ?? 'Reel'}
            className={`normal-case tracking-normal ${fieldClass}`}
          >
            {FORMATOS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          Plataforma
          <select
            name="plataforma"
            defaultValue={piece.plataforma ?? 'Instagram'}
            className={`normal-case tracking-normal ${fieldClass}`}
          >
            {PLATAFORMAS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Fecha planificada
          <input
            name="fecha_planificada"
            type="date"
            defaultValue={piece.fecha_planificada ?? ''}
            className={`normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        <label className={labelClass}>
          Turno
          <select
            name="turno"
            defaultValue={piece.turno ?? 'Temprano'}
            className={`normal-case tracking-normal ${fieldClass}`}
          >
            {TURNOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <label className={labelClass}>
        Protagonista (opcional)
        <input
          name="protagonista"
          type="text"
          defaultValue={piece.protagonista ?? ''}
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <label className={labelClass}>
        Notas internas (no se publican)
        <textarea
          name="notas"
          rows={2}
          defaultValue={piece.notas ?? ''}
          className={`resize-none normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <div className="flex gap-1 rounded-control border border-border bg-surface-2/40 p-1">
        <button
          type="button"
          onClick={() => setNetworkTab('instagram')}
          className={`flex-1 rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
            networkTab === 'instagram' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
          }`}
        >
          Copy Instagram
        </button>
        <button
          type="button"
          onClick={() => setNetworkTab('tiktok')}
          className={`flex-1 rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
            networkTab === 'tiktok' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
          }`}
        >
          Copy TikTok
        </button>
      </div>

      <div className={networkTab === 'instagram' ? 'flex flex-col gap-2' : 'hidden'}>
        <label className={labelClass}>
          Copy (texto que se publica en Instagram)
          <textarea
            name="caption"
            rows={2}
            defaultValue={piece.caption ?? ''}
            className={`resize-none normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        {!instagramConnected && (
          <p className="text-[11px] text-text-3">Conectá Instagram desde Ajustes → Integraciones para ver sus métricas acá más adelante.</p>
        )}
      </div>

      <div className={networkTab === 'tiktok' ? 'flex flex-col gap-2' : 'hidden'}>
        <label className={labelClass}>
          Copy (texto que se publica en TikTok)
          <textarea
            name="tiktok_caption"
            rows={2}
            defaultValue={piece.tiktok_caption ?? ''}
            className={`resize-none normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        {!tiktokConnected && (
          <p className="text-[11px] text-text-3">Conectá TikTok desde Ajustes → Integraciones para ver sus métricas acá más adelante.</p>
        )}
      </div>

      {state.error && <p className="text-xs text-red">{state.error}</p>}

      <div className="flex items-center gap-3">
        <SaveButton />
        <button
          type="button"
          onClick={onSaved}
          className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
