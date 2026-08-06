'use client'

import { useActionState, useState } from 'react'
import { updateCampaignDetailsAction, type SaveState } from './actions'
import { SaveDetailsButton } from './save-details-button'
import { CampaignColorPicker } from '../campaign-color-picker'
import { DEFAULT_CAMPAIGN_COLOR } from '../campaign-colors'
import { CharCounterTextarea } from '@/components/features/char-counter-textarea'
import { TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'
import type { Database } from '@/lib/types/database.types'

type Campaign = Database['public']['Tables']['content_campaigns']['Row']

const FORMATO_OPTIONS = ['Reel', 'TikTok', 'Carrusel', 'Historia', 'Post', 'Live']
const STATUS_OPTIONS = [
  { value: 'planificacion', label: 'En planificación' },
  { value: 'activa', label: 'Activa' },
  { value: 'terminada', label: 'Terminada' },
]

const initialState: SaveState = { error: null, success: false }

// Encontrado roto en la auditoría de cierre del módulo (2026-08-01): mismo
// bug de colores hardcodeados que ya se había corregido en
// add-piece-form.tsx/piece-edit-form.tsx/post-form.tsx, pero este archivo
// había quedado afuera de esas rondas — en dark mode los campos de "Detalles
// de la campaña" quedaban claros, rotos contra el fondo oscuro.
const fieldClass =
  'resize-none rounded-control border border-border bg-surface-2/60 px-3 py-2.5 text-sm text-text outline-none transition-all duration-200 ease-out placeholder:text-text-3 focus-visible:ring-2 focus-visible:ring-accent'

const labelClass = 'flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

export function CampaignDetailsForm({ campaign }: { campaign: Campaign }) {
  const [state, formAction] = useActionState(updateCampaignDetailsAction, initialState)
  const [color, setColor] = useState(campaign.color ?? DEFAULT_CAMPAIGN_COLOR)

  const currentFormatos = Array.isArray(campaign.formatos) ? (campaign.formatos as string[]) : []

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="campaign_id" value={campaign.id} />

      <label className={labelClass}>
        Nombre
        <input
          type="text"
          name="nombre"
          required
          maxLength={TITLE_MAX_LENGTH}
          defaultValue={campaign.nombre}
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Período
          <input
            type="text"
            name="periodo"
            defaultValue={campaign.periodo ?? ''}
            placeholder="Ej: Noviembre 2026"
            className={`normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        <label className={labelClass}>
          Estado
          <select
            name="status"
            defaultValue={campaign.status ?? 'planificacion'}
            className={`normal-case tracking-normal ${fieldClass}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Inicio
          <input
            type="date"
            name="fecha_inicio"
            defaultValue={campaign.fecha_inicio ?? ''}
            className={`normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        <label className={labelClass}>
          Fin
          <input
            type="date"
            name="fecha_fin"
            defaultValue={campaign.fecha_fin ?? ''}
            className={`normal-case tracking-normal ${fieldClass}`}
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Color</span>
        <CampaignColorPicker value={color} onChange={setColor} />
        <input type="hidden" name="color" value={color} />
      </div>

      <label className={labelClass}>
        Objetivo de la campaña
        <CharCounterTextarea
          name="objetivo"
          rows={2}
          maxLength={TEXT_MAX_LENGTH}
          defaultValue={campaign.objetivo}
          placeholder="¿Qué querés lograr con esta campaña?"
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Concepto estratégico
          <span className="text-[10px] font-normal normal-case tracking-normal text-text-3">
            La promesa funcional, corta y literal
          </span>
          <CharCounterTextarea
            name="concepto_estrategico"
            rows={2}
            maxLength={TEXT_MAX_LENGTH}
            defaultValue={campaign.concepto_estrategico}
            placeholder="Ej: Campera reversible al precio más bajo"
            className={`normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        <label className={labelClass}>
          Concepto creativo
          <span className="text-[10px] font-normal normal-case tracking-normal text-text-3">
            La frase evocadora que atraviesa todos los formatos
          </span>
          <CharCounterTextarea
            name="concepto_creativo"
            rows={2}
            maxLength={TEXT_MAX_LENGTH}
            defaultValue={campaign.concepto_creativo}
            placeholder="Ej: Dos camperas, una historia"
            className={`normal-case tracking-normal ${fieldClass}`}
          />
        </label>
      </div>

      <label className={labelClass}>
        Desarrollo y fases
        <span className="text-[10px] font-normal normal-case tracking-normal text-text-3">
          Fase 1, Fase 2 — escribí libremente
        </span>
        <CharCounterTextarea
          name="desarrollo"
          rows={4}
          maxLength={TEXT_MAX_LENGTH}
          defaultValue={campaign.desarrollo}
          placeholder="Fase 1 (semana 1): teaser en historias..."
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <fieldset className={labelClass}>
        <legend>Formatos a utilizar</legend>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
          {FORMATO_OPTIONS.map((formato) => (
            <label
              key={formato}
              className="flex items-center gap-1.5 text-[13px] font-normal normal-case tracking-normal text-text"
            >
              <input
                type="checkbox"
                name="formatos"
                value={formato}
                defaultChecked={currentFormatos.includes(formato)}
                className="accent-accent"
              />
              {formato}
            </label>
          ))}
        </div>
      </fieldset>

      <label className={labelClass}>
        Notas e ideas libres
        <CharCounterTextarea
          name="notas"
          rows={3}
          maxLength={TEXT_MAX_LENGTH}
          defaultValue={campaign.notas}
          placeholder="Ideas sueltas, referencias, inspiración..."
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <div className="flex items-center gap-3">
        <SaveDetailsButton />
        {state.success && <span className="text-xs text-green">Guardado</span>}
        {state.error && <span className="text-xs text-red">{state.error}</span>}
      </div>
    </form>
  )
}
