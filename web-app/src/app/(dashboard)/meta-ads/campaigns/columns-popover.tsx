'use client'

import { useEffect, useRef } from 'react'
import { METRIC_LABELS, COLUMN_PRESETS, type MetricColumnId } from './metric-defs'

export function ColumnsPopover({
  activeColumns,
  onChange,
  onClose,
}: {
  activeColumns: MetricColumnId[]
  onChange: (next: MetricColumnId[]) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  function toggle(id: MetricColumnId) {
    onChange(activeColumns.includes(id) ? activeColumns.filter((c) => c !== id) : [...activeColumns, id])
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[220px] rounded-control border border-border-2 bg-surface p-3 shadow-[0_8px_32px_rgba(0,0,0,0.16)]"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Columnas visibles</p>
        <span className="text-[10px] text-text-3">{activeColumns.length}/{METRIC_LABELS.length}</span>
      </div>

      <div className="mb-2.5 flex flex-col gap-1 border-b border-border pb-2.5">
        <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-text-3">Vistas pre-armadas</p>
        {COLUMN_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            title={preset.description}
            onClick={() => {
              onChange(preset.columns)
              onClose()
            }}
            className="rounded-md px-1.5 py-1 text-left text-[12px] font-medium text-accent transition-colors duration-150 ease-out hover:bg-accent/[0.08]"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex max-h-[360px] flex-col gap-1.5 overflow-y-auto pr-1">
        {METRIC_LABELS.map((column) => (
          <label
            key={column.id}
            className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[13px] text-text transition-colors duration-150 ease-out hover:bg-surface-2"
          >
            <input
              type="checkbox"
              checked={activeColumns.includes(column.id)}
              onChange={() => toggle(column.id)}
              className="accent-accent"
            />
            {column.label}
          </label>
        ))}
      </div>
    </div>
  )
}
