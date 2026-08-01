'use client'

import { useEffect, useRef, useState } from 'react'
import { deletePreset, loadPresets, savePreset, type WizardPreset } from '@/lib/wizard-presets'
import { fieldClass } from './wizard-styles'

export function PresetsMenu({
  getCurrentConfig,
  onApply,
}: {
  getCurrentConfig: () => Omit<WizardPreset, 'id' | 'name' | 'createdAt'>
  onApply: (preset: WizardPreset) => void
}) {
  const [open, setOpen] = useState<'use' | 'save' | null>(null)
  const [presets, setPresets] = useState<WizardPreset[]>([])
  const [saveName, setSaveName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Recargar la lista al abrir el picker (no en un effect, para evitar el
  // doble render que dispara setState-in-effect — mismo patrón que el resto
  // del wizard usa para sincronizar estado derivado de una prop/valor que cambia).
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open === 'use') setPresets(loadPresets())
  }

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(null)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  function handleApply(preset: WizardPreset) {
    onApply(preset)
    setOpen(null)
  }

  function handleDelete(id: string) {
    deletePreset(id)
    setPresets(loadPresets())
  }

  function handleSave() {
    const name = saveName.trim()
    if (!name) return
    savePreset({
      id: `preset_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      ...getCurrentConfig(),
    })
    setSaveName('')
    setOpen(null)
  }

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(open === 'use' ? null : 'use')}
        className="text-xs font-semibold text-accent transition-colors duration-200 ease-out hover:text-primary-hover"
      >
        Usar preset
      </button>
      <span className="text-border-2">·</span>
      <button
        type="button"
        onClick={() => setOpen(open === 'save' ? null : 'save')}
        className="text-xs font-semibold text-accent transition-colors duration-200 ease-out hover:text-primary-hover"
      >
        Guardar preset
      </button>

      {open === 'use' && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 max-h-[280px] w-[280px] overflow-y-auto rounded-control border border-border-2 bg-surface p-2 shadow-[0_8px_32px_rgba(0,0,0,0.16)]">
          {presets.length === 0 ? (
            <p className="px-2 py-3 text-xs text-text-3">Sin presets guardados todavía.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {presets.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2">
                  <button type="button" onClick={() => handleApply(p)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[13px] font-semibold text-text">{p.name}</span>
                    <span className="block truncate text-[11px] text-text-3">
                      {p.budgetMode === 'cbo' ? 'CBO' : 'ABO'} · USD {p.dailyBudget || 0}/día
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="shrink-0 text-[11px] font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {open === 'save' && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[280px] rounded-control border border-border-2 bg-surface p-3 shadow-[0_8px_32px_rgba(0,0,0,0.16)]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-3">Guardar como preset</p>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSave()
              }
            }}
            placeholder="Ej: Retargeting invierno"
            className={'mb-2 w-full ' + fieldClass}
            autoFocus
          />
          <p className="mb-2 text-[11px] text-text-3">
            Guarda objetivo, presupuesto, puja, ubicaciones, pixel y página — el creativo y el copy los cargás cada vez.
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={!saveName.trim()}
            className="w-full rounded-control bg-primary px-3 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  )
}
