'use client'

import { useActionState, useState } from 'react'
import { createPieceAction, type CreatePieceState } from './actions'
import { CreatePieceButton } from './create-piece-button'

const FORMATOS = ['Reel', 'TikTok', 'Carrusel', 'Historia', 'Post', 'Video largo', 'Otro']
const PLATAFORMAS = ['Instagram', 'TikTok', 'Ambas', 'YouTube']
const TURNOS = ['Temprano', 'Tarde', 'Noche']

const initialState: CreatePieceState = { error: null }

const fieldClass =
  'rounded-control border border-[#D0D5DD] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#101828] outline-none transition-all duration-200 ease-out placeholder:text-[#667085] focus-visible:ring-2 focus-visible:ring-accent'

const labelClass = 'flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

export function AddPieceForm({ campaignId }: { campaignId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, formAction] = useActionState(createPieceAction, initialState)

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-fit rounded-control border border-primary/25 bg-transparent px-4 py-2 text-[13px] font-semibold text-primary transition-all duration-200 ease-out hover:bg-primary/[6%] active:scale-[0.98]"
      >
        + Nueva pieza
      </button>
    )
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-5"
    >
      <input type="hidden" name="campaign_id" value={campaignId} />

      <label className={labelClass}>
        Título
        <input
          name="titulo"
          type="text"
          required
          autoFocus
          placeholder="Ej: Reel unboxing, Carrusel 5 outfits…"
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Formato
          <select name="formato" defaultValue="Reel" className={`normal-case tracking-normal ${fieldClass}`}>
            {FORMATOS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Plataforma
          <select
            name="plataforma"
            defaultValue="Instagram"
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
          <input name="fecha_planificada" type="date" className={`normal-case tracking-normal ${fieldClass}`} />
        </label>
        <label className={labelClass}>
          Turno
          <select name="turno" defaultValue="Temprano" className={`normal-case tracking-normal ${fieldClass}`}>
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
          placeholder="Quién actúa en el video…"
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <label className={labelClass}>
        Notas
        <textarea
          name="notas"
          rows={2}
          placeholder="Hook, guion, referencia, idea…"
          className={`resize-none normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <label className={labelClass}>
        Foto o video de referencia (opcional)
        <input
          name="media_files"
          type="file"
          accept="image/*,video/*"
          multiple
          className="text-[13px] font-normal normal-case tracking-normal text-text-2 file:mr-3 file:rounded-control file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-text-2 file:transition-all file:duration-200 file:ease-out hover:file:bg-border-2"
        />
        <span className="text-[11px] font-normal normal-case tracking-normal text-text-3">
          Para mostrar cómo tiene que quedar la pieza, o que el equipo entienda la idea.
        </span>
      </label>

      <p
        role="alert"
        className={`min-h-[16px] text-xs transition-opacity duration-200 ease-out ${
          state.error ? 'text-red opacity-100' : 'opacity-0'
        }`}
      >
        {state.error}
      </p>

      <div className="flex items-center gap-3">
        <CreatePieceButton />
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
