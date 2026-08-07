'use client'

import { useEffect, useState } from 'react'
import { getAdFatigueSignalAction, type AdFatigueActionResult } from '../actions'
import type { FatigueSignal } from '@/lib/meta/fatigue'

// "Predicción de Fatiga" (2026-08-07) — se dispara solo al montar la fila de
// un anuncio ACTIVE con gasto real (nunca para PAUSED/sin gasto — no hay
// nada que fatigar todavía). Igual que StrategicStatusDot: nada se ve
// mientras carga ni si no hay señal, un ícono sutil con motivo en tooltip
// cuando sí la hay — no es un banner que empuje el resto de la fila.
export function FatigueBadge({ adId, effectiveStatus, spend }: { adId: string; effectiveStatus: string; spend: number }) {
  const [signal, setSignal] = useState<FatigueSignal | null>(null)
  const [hover, setHover] = useState(false)
  const eligible = effectiveStatus === 'ACTIVE' && spend > 0

  useEffect(() => {
    if (!eligible) return
    let cancelled = false
    getAdFatigueSignalAction(adId).then((result: AdFatigueActionResult) => {
      if (cancelled || !result.ok) return
      setSignal(result.signal)
    })
    return () => {
      cancelled = true
    }
  }, [adId, eligible])

  if (!signal) return null

  const reason = `Frecuencia subió de ${signal.frequencyBefore.toFixed(1)} a ${signal.frequencyAfter.toFixed(1)} mientras el CTR cayó ${Math.round(signal.ctrDropPct)}% en los últimos 14 días — la audiencia ya vio demasiadas veces este anuncio. Conviene renovar el creativo antes de que el CPA se dispare.`

  return (
    <span className="relative inline-flex shrink-0" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber">
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      </svg>
      {hover && (
        <span className="absolute bottom-[calc(100%+6px)] left-1/2 z-20 w-60 -translate-x-1/2 rounded-control border border-border-2 bg-surface px-2.5 py-2 text-left text-[11px] leading-relaxed text-text-2 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          {reason}
        </span>
      )}
    </span>
  )
}
