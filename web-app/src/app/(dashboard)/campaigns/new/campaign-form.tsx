'use client'

import { useActionState, useState } from 'react'
import { createCampaignAction, type CreateCampaignState } from '../actions'
import { CreateCampaignButton } from './create-campaign-button'
import { TextInput, TextArea } from '@/components/features/form-field'
import { TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'

const initialState: CreateCampaignState = { error: null }

const labelClass = 'text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

// Paleta acotada (no color picker libre) — así toda campaña queda
// distinguible en el Calendario general sin que dos usuarios elijan tonos
// casi idénticos entre sí. #4C7EFF es el mismo azul que unified-items.ts ya
// usa como fallback para campañas sin color propio — se incluye acá para
// que "no elegir nada distinto" siga dando el mismo resultado de siempre.
const CAMPAIGN_COLORS = ['#4C7EFF', '#7C5CFC', '#E0637D', '#E08A3C', '#3EBA85', '#34B3C2', '#8B93A3'] as const

export function CampaignForm() {
  const [state, formAction] = useActionState(createCampaignAction, initialState)
  const [color, setColor] = useState<string>(CAMPAIGN_COLORS[0])

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
        <div className="flex items-center gap-2">
          {CAMPAIGN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Elegir color ${c}`}
              aria-pressed={color === c}
              className={`h-7 w-7 shrink-0 rounded-full transition-transform duration-150 ease-out ${
                color === c ? 'scale-110 ring-2 ring-offset-2 ring-offset-surface' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: c, ...(color === c ? ({ '--tw-ring-color': c } as React.CSSProperties) : {}) }}
            />
          ))}
        </div>
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
