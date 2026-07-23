'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { saveBusinessProfileAction, type BusinessProfileState } from './actions'
import type { Database } from '@/lib/types/database.types'

type BusinessProfile = Database['public']['Tables']['business_profile']['Row']

const initialState: BusinessProfileState = { error: null, success: false }

const fieldClass =
  'rounded-control border border-[#D0D5DD] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#101828] outline-none transition-all duration-200 ease-out placeholder:text-[#667085] focus-visible:ring-2 focus-visible:ring-accent'

const labelClass = 'flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

function SaveButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Guardando…' : 'Guardar perfil de negocio'}
    </button>
  )
}

export function BusinessProfileForm({ profile }: { profile: BusinessProfile | null }) {
  const [state, formAction] = useActionState(saveBusinessProfileAction, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Nombre de marca
          <input
            name="brand_name"
            type="text"
            defaultValue={profile?.brand_name ?? ''}
            placeholder="Ej: KIRIZ"
            className={`normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        <label className={labelClass}>
          Rubro
          <input
            name="rubro"
            type="text"
            defaultValue={profile?.rubro ?? ''}
            placeholder="Ej: Streetwear"
            className={`normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        <label className={labelClass}>
          Ubicación
          <input
            name="ubicacion"
            type="text"
            defaultValue={profile?.ubicacion ?? ''}
            placeholder="Ej: Laferrere, Buenos Aires"
            className={`normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        <label className={labelClass}>
          Tono de comunicación
          <input
            name="tono"
            type="text"
            defaultValue={profile?.tono ?? ''}
            placeholder="Ej: directo, sin vueltas, rioplatense"
            className={`normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        <label className={labelClass}>
          Breakeven ROAS
          <input
            name="breakeven_roas"
            type="number"
            step="0.1"
            defaultValue={profile?.breakeven_roas ?? ''}
            placeholder="2"
            className={`normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        <label className={labelClass}>
          Margen bruto objetivo (%)
          <input
            name="margen_bruto_objetivo"
            type="number"
            step="0.1"
            defaultValue={profile?.margen_bruto_objetivo ?? ''}
            placeholder="48"
            className={`normal-case tracking-normal ${fieldClass}`}
          />
        </label>
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[.1em] text-text-3">
          Expertos que &quot;piensan&quot; dentro de tu IA
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Experto 1 — nombre
            <input
              name="experto1_nombre"
              type="text"
              defaultValue={profile?.experto1_nombre ?? ''}
              placeholder="Ej: Rodri"
              className={`normal-case tracking-normal ${fieldClass}`}
            />
          </label>
          <label className={labelClass}>
            Experto 1 — expertise
            <input
              name="experto1_rol"
              type="text"
              defaultValue={profile?.experto1_rol ?? ''}
              placeholder="Ej: Meta Ads, Tienda Nube, e-commerce"
              className={`normal-case tracking-normal ${fieldClass}`}
            />
          </label>
          <label className={labelClass}>
            Experto 2 — nombre
            <input
              name="experto2_nombre"
              type="text"
              defaultValue={profile?.experto2_nombre ?? ''}
              placeholder="Ej: Tizi"
              className={`normal-case tracking-normal ${fieldClass}`}
            />
          </label>
          <label className={labelClass}>
            Experto 2 — expertise
            <input
              name="experto2_rol"
              type="text"
              defaultValue={profile?.experto2_rol ?? ''}
              placeholder="Ej: Comunicación y publicidad"
              className={`normal-case tracking-normal ${fieldClass}`}
            />
          </label>
        </div>
      </div>

      <label className={labelClass}>
        Notas libres (opcional)
        <textarea
          name="notas_libres"
          rows={3}
          defaultValue={profile?.notas_libres ?? ''}
          placeholder="Cualquier otro contexto que la IA deba saber siempre…"
          className={`resize-none normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      {state.error && <p className="text-xs text-red">{state.error}</p>}
      {state.success && <p className="text-xs text-green">Perfil guardado correctamente.</p>}

      <div>
        <SaveButton />
      </div>
    </form>
  )
}
