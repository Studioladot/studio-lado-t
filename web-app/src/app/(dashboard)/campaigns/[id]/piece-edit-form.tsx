'use client'

import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { updatePieceAction, type UpdatePieceState } from './actions'
import type { Database } from '@/lib/types/database.types'

type Piece = Database['public']['Tables']['content_piezas']['Row']

const FORMATOS = ['Reel', 'TikTok', 'Carrusel', 'Historia', 'Post', 'Video largo', 'Otro']
const PLATAFORMAS = ['Instagram', 'TikTok', 'Ambas', 'YouTube']
const TURNOS = ['Temprano', 'Tarde', 'Noche']

const initialState: UpdatePieceState = { error: null, success: false }

const fieldClass =
  'rounded-control border border-[#D0D5DD] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#101828] outline-none transition-all duration-200 ease-out placeholder:text-[#667085] focus-visible:ring-2 focus-visible:ring-accent'

const labelClass = 'flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

function SaveButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Guardando…' : 'Guardar'}
    </button>
  )
}

export function PieceEditForm({
  piece,
  campaignId,
  onSaved,
}: {
  piece: Piece
  campaignId: string
  onSaved: () => void
}) {
  const boundAction = updatePieceAction.bind(null, piece.id, campaignId)
  const [state, formAction] = useActionState(boundAction, initialState)

  useEffect(() => {
    if (state.success) onSaved()
  }, [state.success, onSaved])

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

      <div className="grid grid-cols-2 gap-3">
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
      </div>

      <div className="grid grid-cols-2 gap-3">
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
        Notas
        <textarea
          name="notas"
          rows={2}
          defaultValue={piece.notas ?? ''}
          className={`resize-none normal-case tracking-normal ${fieldClass}`}
        />
      </label>

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
