'use client'

import { useRef, useState } from 'react'

const RANGE_OPTIONS = [
  { value: '7', label: '7 días' },
  { value: '14', label: '14 días' },
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Activas' },
  { value: 'paused', label: 'Pausadas' },
  { value: 'other', label: 'Otras' },
]

const inputClass =
  'rounded-control border border-border bg-surface px-2.5 py-1.5 text-[13px] text-text outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent'

// Mismas píldoras de filtro que el legado (clase `.ft`, ver filterBib/tsSetBudgetType
// en app.html) — ya reusadas en el wizard de "Lanzar Testeo" esta sesión.
const pillGroupClass = 'inline-flex flex-wrap gap-0.5 rounded-control border border-border p-0.5'
function pillClass(active: boolean) {
  return `whitespace-nowrap rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
    active ? 'bg-primary text-white' : 'text-text-2 hover:text-text'
  }`
}

export function CampaignsFilters({
  defaultQuery,
  defaultStatus,
  defaultRange,
}: {
  defaultQuery: string
  defaultStatus: string
  defaultRange: string
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const statusRef = useRef<HTMLInputElement>(null)
  const rangeRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState(defaultStatus)
  const [range, setRange] = useState(defaultRange)

  // Escribe el input oculto directo por ref (no depende de que React ya haya
  // re-renderizado con el nuevo `value`) y recién ahí manda el form — mismo
  // motivo que la validación cross-step del wizard de Lanzar Testeo.
  function selectStatus(value: string) {
    setStatus(value)
    if (statusRef.current) statusRef.current.value = value
    formRef.current?.requestSubmit()
  }

  function selectRange(value: string) {
    setRange(value)
    if (rangeRef.current) rangeRef.current.value = value
    formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} className="mb-4 flex flex-wrap items-center gap-3">
      <input
        type="text"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Buscar por nombre…"
        className={`${inputClass} w-full max-w-[220px]`}
      />

      <input ref={statusRef} type="hidden" name="status" defaultValue={status} />
      <div className={pillGroupClass}>
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={status === option.value}
            onClick={() => selectStatus(option.value)}
            className={pillClass(status === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <input ref={rangeRef} type="hidden" name="range" defaultValue={range} />
      <div className={pillGroupClass}>
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={range === option.value}
            onClick={() => selectRange(option.value)}
            className={pillClass(range === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <button
        type="submit"
        className="rounded-control border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-text-2 transition-all duration-200 ease-out hover:bg-surface-2 hover:text-text active:scale-[0.98]"
      >
        Buscar
      </button>
    </form>
  )
}
