'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// Presets + rango personalizado (2026-07-27) — antes solo había presets fijos.
// "Personalizado…" revela dos inputs de fecha nativos (sin librería), que
// escriben ?from=&to= en la URL y limpian ?days=; volver a un preset hace lo
// inverso. page.tsx (resolvePeriod) es la única fuente de verdad de cómo se
// interpreta esto.

const OPTIONS = [
  { value: '7', label: '7 días' },
  { value: '14', label: '14 días' },
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
]

const FIELD_CLASS =
  'rounded-control border border-border bg-surface px-2 py-1.5 text-[12px] text-text outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent'

export function PeriodSelector({
  activePreset,
  customFrom,
  customTo,
}: {
  activePreset: number | null
  customFrom: string | null
  customTo: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [customOpen, setCustomOpen] = useState(activePreset === null)
  const [from, setFrom] = useState(customFrom ?? '')
  const [to, setTo] = useState(customTo ?? '')

  function applyPreset(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('days', value)
    params.delete('from')
    params.delete('to')
    setCustomOpen(false)
    router.push(`${pathname}?${params.toString()}`)
  }

  function applyCustomRange() {
    if (!from || !to) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('from', from)
    params.set('to', to)
    params.delete('days')
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSelectChange(value: string) {
    if (value === 'custom') {
      setCustomOpen(true)
      return
    }
    applyPreset(value)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={activePreset !== null ? String(activePreset) : 'custom'}
        onChange={(e) => handleSelectChange(e.target.value)}
        className="rounded-control border border-border bg-surface px-2.5 py-1.5 text-[13px] text-text outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value="custom">Personalizado…</option>
      </select>
      {customOpen && (
        <div className="flex items-center gap-1.5">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD_CLASS} />
          <span className="text-[11px] text-text-3">a</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={FIELD_CLASS} />
          <button
            type="button"
            disabled={!from || !to}
            onClick={applyCustomRange}
            className="rounded-control bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 ease-out hover:bg-primary-hover disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  )
}
