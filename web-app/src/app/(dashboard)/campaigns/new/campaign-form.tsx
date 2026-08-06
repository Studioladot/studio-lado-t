'use client'

import { useActionState, useState } from 'react'
import { createCampaignAction, type CreateCampaignState } from '../actions'
import { CreateCampaignButton } from './create-campaign-button'
import { CampaignColorPicker } from '../campaign-color-picker'
import { DEFAULT_CAMPAIGN_COLOR } from '../campaign-colors'
import { TextInput, TextArea } from '@/components/features/form-field'
import { TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'

const initialState: CreateCampaignState = { error: null }

const labelClass = 'text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

export function CampaignForm() {
  const [state, formAction] = useActionState(createCampaignAction, initialState)
  const [color, setColor] = useState<string>(DEFAULT_CAMPAIGN_COLOR)

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
          maxLength={TITLE_MAX_LENGTH}
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
        <TextArea id="objetivo" name="objetivo" rows={3} maxLength={TEXT_MAX_LENGTH} placeholder="¿Qué buscás lograr con esta campaña?" />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Color</span>
        <CampaignColorPicker value={color} onChange={setColor} />
        <input type="hidden" name="color" value={color} />
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
