'use client'

import { useState } from 'react'
import { savePillarsAction } from '@/lib/pillars-actions'
import { useToast } from './toast'
import { FORM_LABEL_CLASS, Select, TextInput } from './form-field'
import type { ContentPillar } from '@/lib/pillars'

// "Pilares Estratégicos" — selector compartido (2026-08-07). Vive en
// components/features/ (no en ningún módulo puntual) porque Publicaciones,
// Campañas de Meta Ads y Notas lo usan por igual — mismo criterio que
// ConfirmSubmitButton/DropdownMenu. El lápiz de edición abre un modal
// minimalista para agregar/renombrar/quitar pilares; el cambio se refleja
// al toque en el <select> de ESTE formulario (estado local) y, vía
// revalidatePath en savePillarsAction, en el resto de la plataforma en la
// próxima carga de cada módulo.
export function PillarField({
  pillars: initialPillars,
  defaultValue,
  name = 'pillar',
  label = 'Pilar Estratégico',
}: {
  pillars: ContentPillar[]
  defaultValue: string
  name?: string
  label?: string
}) {
  const [pillars, setPillars] = useState(initialPillars)
  const [managing, setManaging] = useState(false)

  // Si el valor actual ya no está entre los pilares vigentes (se borró o se
  // renombró desde el modal), se agrega como opción extra — perder
  // silenciosamente el dato histórico del <select> sería peor que mostrar
  // una opción que ya no es "oficial".
  const options = defaultValue && !pillars.some((p) => p.name === defaultValue) ? [...pillars, { id: '__legacy__', name: defaultValue, sortOrder: -1 }] : pillars

  return (
    <label className={FORM_LABEL_CLASS}>
      {label}
      <div className="flex items-center gap-1.5">
        <Select name={name} defaultValue={defaultValue} className="min-w-0 flex-1 normal-case tracking-normal">
          {options.length === 0 && <option value="">Sin pilares</option>}
          {options.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            setManaging(true)
          }}
          aria-label="Editar pilares estratégicos"
          title="Editar pilares estratégicos"
          className="flex h-[38px] w-[30px] shrink-0 items-center justify-center rounded-control border border-border text-text-3 transition-colors duration-200 ease-out hover:border-accent/40 hover:text-accent"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </button>
      </div>

      {managing && (
        <ManagePillarsModal
          pillars={pillars}
          onClose={() => setManaging(false)}
          onSaved={(next) => {
            setPillars(next)
            setManaging(false)
          }}
        />
      )}
    </label>
  )
}

function ManagePillarsModal({
  pillars,
  onClose,
  onSaved,
}: {
  pillars: ContentPillar[]
  onClose: () => void
  onSaved: (next: ContentPillar[]) => void
}) {
  const [names, setNames] = useState(pillars.length > 0 ? pillars.map((p) => p.name) : [''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  function updateName(i: number, value: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)))
  }

  function removeAt(i: number) {
    setNames((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    const cleaned = names.map((n) => n.trim()).filter(Boolean)
    if (cleaned.length === 0) {
      setError('Agregá al menos un pilar.')
      return
    }
    setSaving(true)
    setError(null)
    const result = await savePillarsAction(cleaned)
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.show('Pilares actualizados', 'success')
    onSaved(result.pillars)
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-[380px] rounded-card border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <p className="mb-1 text-sm font-bold normal-case tracking-normal text-text">Pilares estratégicos</p>
        <p className="mb-4 text-xs font-normal normal-case tracking-normal text-text-2">
          Editá, agregá o quitá los pilares de tu cuenta — el cambio se aplica en Publicaciones, Campañas y Notas por igual.
        </p>

        <div className="flex flex-col gap-2">
          {names.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <TextInput
                type="text"
                value={name}
                onChange={(e) => updateName(i, e.target.value)}
                placeholder="Nombre del pilar"
                maxLength={40}
                className="flex-1 normal-case tracking-normal"
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Quitar pilar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-text-3 transition-colors duration-200 ease-out hover:bg-red/[0.08] hover:text-red"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setNames((prev) => [...prev, ''])}
          className="mt-2.5 text-xs font-semibold normal-case tracking-normal text-accent transition-colors duration-200 ease-out hover:text-primary-hover"
        >
          + Agregar pilar
        </button>

        {error && <p className="mt-2 text-xs normal-case tracking-normal text-red">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium normal-case tracking-normal text-text-2 transition-colors duration-200 ease-out hover:text-text"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-control bg-primary px-4 py-2 text-xs font-semibold normal-case tracking-normal text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
