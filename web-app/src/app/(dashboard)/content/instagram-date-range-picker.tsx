'use client'

import { useState } from 'react'
import { DATE_RANGE_OPTIONS, type DateRangeMode } from '@/lib/instagram/date-range'

function CalendarIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.25" y="3.5" width="13.5" height="12" rx="1.75" />
      <path d="M2.25 7.25h13.5M6 2v3M12 2v3" />
    </svg>
  )
}

/**
 * Único selector de rango de fechas de toda la sección "Rendimiento
 * Instagram" (2026-08-06) — vive arriba de todo, en PerformanceTab, y
 * controla tanto los KPIs/gráficos de cuenta como la grilla de contenido.
 * Antes había una copia sin conectar adentro del Catálogo; se sacó de ahí
 * para no tener dos controles de fecha independientes en la misma página.
 */
export function DateRangePicker({ value, onChange }: { value: DateRangeMode; onChange: (mode: DateRangeMode) => void }) {
  const [open, setOpen] = useState(false)
  const current = DATE_RANGE_OPTIONS.find((o) => o.value === value) ?? DATE_RANGE_OPTIONS[1]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-control border border-border bg-surface-2/40 px-2.5 py-1.5 text-[11px] font-semibold text-text-2 transition-colors duration-200 ease-out hover:text-text"
      >
        <CalendarIcon size={11} />
        {current.label}
        <svg
          width="8"
          height="8"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition-transform duration-200 ease-out ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2.5 3.5 5 6l2.5-2.5" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+4px)] z-20 flex w-40 flex-col gap-0.5 rounded-control border border-border bg-surface p-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)]">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`rounded-control px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors duration-200 ease-out ${
                  opt.value === value ? 'bg-accent/[0.12] text-accent' : 'text-text-2 hover:bg-surface-2 hover:text-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
