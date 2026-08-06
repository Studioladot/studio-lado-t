'use client'

import { CAMPAIGN_COLORS } from './campaign-colors'

// Selector visual de color de campaña — compartido entre creación
// (campaign-form.tsx) y edición (campaign-details-form.tsx) para no
// duplicar el mismo JSX de swatches dos veces (limpieza de cierre de Fase
// 1, 2026-08-06).

export function CampaignColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      {CAMPAIGN_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Elegir color ${c}`}
          aria-pressed={value === c}
          className={`h-7 w-7 shrink-0 rounded-full transition-transform duration-150 ease-out ${
            value === c ? 'scale-110 ring-2 ring-offset-2 ring-offset-surface' : 'hover:scale-105'
          }`}
          style={{ backgroundColor: c, ...(value === c ? ({ '--tw-ring-color': c } as React.CSSProperties) : {}) }}
        />
      ))}
    </div>
  )
}
