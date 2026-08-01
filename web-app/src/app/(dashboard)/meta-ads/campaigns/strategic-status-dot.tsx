'use client'

import { useState } from 'react'
import { getStrategicStatus, type CampaignTargets, type MetaMetricsForStatus } from '@/lib/meta/autopilot'

const DOT_CLASS: Record<'escalar' | 'optimizar' | 'kill', string> = {
  escalar: 'bg-green',
  optimizar: 'bg-amber',
  kill: 'bg-red',
}

// Punto sutil, no badge — "de un vistazo", sin sumar texto/ruido a la fila.
// El motivo (texto plano, ya lo genera getStrategicStatus) aparece en un
// tooltip nativo al pasar el mouse, no ocupa espacio hasta que se lo pide.
export function StrategicStatusDot({ metrics, targets }: { metrics: MetaMetricsForStatus; targets: CampaignTargets }) {
  const [hover, setHover] = useState(false)
  const status = getStrategicStatus(metrics, targets)
  if (!status) return null

  return (
    <span className="relative inline-flex shrink-0" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <span className={`block h-2 w-2 rounded-full ${DOT_CLASS[status.label]}`} />
      {hover && (
        <span className="absolute bottom-[calc(100%+6px)] left-1/2 z-20 w-[220px] -translate-x-1/2 rounded-control border border-border-2 bg-surface px-2.5 py-2 text-left text-[11px] leading-relaxed text-text-2 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          {status.reason}
        </span>
      )}
    </span>
  )
}
