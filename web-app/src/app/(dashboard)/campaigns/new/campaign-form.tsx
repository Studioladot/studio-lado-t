'use client'

import { useActionState } from 'react'
import { createCampaignAction, type CreateCampaignState } from '../actions'
import { CreateCampaignButton } from './create-campaign-button'

const initialState: CreateCampaignState = { error: null }

const fieldClass =
  'rounded-control border border-[#D0D5DD] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#101828] outline-none transition-all duration-200 ease-out placeholder:text-[#667085] focus-visible:ring-2 focus-visible:ring-accent'

const labelClass = 'text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

export function CampaignForm() {
  const [state, formAction] = useActionState(createCampaignAction, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className={labelClass}>
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          autoFocus
          placeholder="Ej: Lanzamiento colección verano"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="periodo" className={labelClass}>
          Período
        </label>
        <input id="periodo" name="periodo" type="text" placeholder="Ej: Noviembre 2026" className={fieldClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fecha_inicio" className={labelClass}>
            Inicio
          </label>
          <input id="fecha_inicio" name="fecha_inicio" type="date" className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fecha_fin" className={labelClass}>
            Fin
          </label>
          <input id="fecha_fin" name="fecha_fin" type="date" className={fieldClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="objetivo" className={labelClass}>
          Objetivo
        </label>
        <textarea
          id="objetivo"
          name="objetivo"
          rows={3}
          placeholder="¿Qué buscás lograr con esta campaña?"
          className={`resize-none ${fieldClass}`}
        />
      </div>

      <p
        role="alert"
        className={`min-h-[16px] text-xs transition-opacity duration-200 ease-out ${
          state.error ? 'text-red opacity-100' : 'opacity-0'
        }`}
      >
        {state.error}
      </p>

      <CreateCampaignButton />
    </form>
  )
}
