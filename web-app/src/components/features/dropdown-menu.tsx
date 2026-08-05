'use client'

import { useEffect, useRef, useState } from 'react'

// Primitiva genérica de menú desplegable (pulido UX/UI, 2026-08-06) —
// reemplaza las tiras de pastillas sueltas de filtros ("choclo visual") por
// un único trigger + panel. No asume nada sobre el contenido: el trigger y
// las opciones se componen desde afuera (botones con estado local o Links
// de Next para filtros server-side vía searchParams), esta pieza solo
// resuelve abrir/cerrar, click afuera y Escape una sola vez para todo el
// proyecto.
export function DropdownMenu({
  trigger,
  children,
  align = 'left',
}: {
  trigger: (state: { open: boolean; toggle: () => void }) => React.ReactNode
  children: (close: () => void) => React.ReactNode
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={`absolute top-[calc(100%+6px)] z-30 min-w-[172px] overflow-hidden rounded-control border border-border bg-surface py-1 shadow-[0_8px_24px_rgba(0,0,0,0.16)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function DropdownItem({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-3.5 py-2 text-left text-xs transition-colors duration-150 ease-out hover:bg-surface-2 ${
        active ? 'font-semibold text-accent' : 'text-text-2'
      }`}
    >
      {children}
    </button>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform duration-200 ease-out ${open ? 'rotate-180' : ''}`}
    >
      <path d="M2 3.5 5 6.5 8 3.5" />
    </svg>
  )
}

/** Trigger estándar reusado por todos los dropdowns de filtro del proyecto — mismo look que las pastillas que reemplaza. */
export function FilterTrigger({
  label,
  value,
  open,
  onClick,
  active,
}: {
  label: string
  value: string
  open: boolean
  onClick: () => void
  active: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out ${
        active ? 'border-accent bg-accent/[0.08] text-accent' : 'border-border text-text-2 hover:bg-surface-2'
      }`}
    >
      <span className={active ? 'text-accent/70' : 'text-text-3'}>{label}:</span>
      {value}
      <ChevronIcon open={open} />
    </button>
  )
}
