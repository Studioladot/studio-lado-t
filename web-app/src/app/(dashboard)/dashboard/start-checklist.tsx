'use client'

import { useEffect, useState } from 'react'

const SEEN_KEY = 'gotix_start_checklist_dismissed'

export type ChecklistItem = { label: string; done: boolean }

// "Checklist de Inicio" (2026-08-08) — reemplaza el modal de bienvenida
// anterior (onboarding-checklist.tsx, con íconos de check y un botón con
// gradiente): la regla de diseño nueva es cero íconos/emojis, así que el
// progreso se resuelve solo con tachado (line-through) + un contador de
// texto ("2 de 3 completados"), sin barra de progreso ni checkmarks. Vive
// inline en el Dashboard, no como modal — no interrumpe, solo acompaña.
export function StartChecklist({ items }: { items: ChecklistItem[] }) {
  const allDone = items.every((i) => i.done)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (allDone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lee localStorage, solo existe en el browser.
      setDismissed(localStorage.getItem(SEEN_KEY) === '1')
    }
  }, [allDone])

  if (allDone && dismissed) return null

  const doneCount = items.filter((i) => i.done).length

  return (
    <div className="mb-3.5 rounded-card border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Primeros pasos</p>
        <span className="text-[11px] font-medium text-text-3">
          {doneCount} de {items.length} completados
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.label} className={`text-sm ${item.done ? 'text-text-3 line-through' : 'font-medium text-text'}`}>
            {item.label}
          </li>
        ))}
      </ul>
      {allDone && (
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(SEEN_KEY, '1')
            setDismissed(true)
          }}
          className="mt-3 text-xs font-semibold text-accent transition-colors duration-200 ease-out hover:text-primary-hover"
        >
          Ocultar
        </button>
      )}
    </div>
  )
}
