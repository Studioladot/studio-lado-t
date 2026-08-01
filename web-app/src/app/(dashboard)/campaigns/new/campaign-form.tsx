'use client'

import { useActionState } from 'react'
import { createCampaignAction, type CreateCampaignState } from '../actions'
import { CreateCampaignButton } from './create-campaign-button'
import { TextInput, TextArea } from '@/components/features/form-field'

const initialState: CreateCampaignState = { error: null }

const labelClass = 'text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

export function CampaignForm() {
  const [state, formAction] = useActionState(createCampaignAction, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className={labelClass}>
          Nombre
        </label>
        <TextInput
          id="nombre"
          name="nombre"
          type="text"
          required
          autoFocus
          placeholder="Ej: Lanzamiento colección verano"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="periodo" className={labelClass}>
          Período
        </label>
        <TextInput id="periodo" name="periodo" type="text" placeholder="Ej: Noviembre 2026" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fecha_inicio" className={labelClass}>
            Inicio
          </label>
          <TextInput id="fecha_inicio" name="fecha_inicio" type="date" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fecha_fin" className={labelClass}>
            Fin
          </label>
          <TextInput id="fecha_fin" name="fecha_fin" type="date" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="objetivo" className={labelClass}>
          Objetivo
        </label>
        <TextArea id="objetivo" name="objetivo" rows={3} placeholder="¿Qué buscás lograr con esta campaña?" />
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
