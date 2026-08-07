'use client'

import { useState } from 'react'
import { markAdAsContentWinnerAction } from '../actions'
import { useToast } from '@/components/features/toast'

// "Ranking de Ganadores Cross-Cuenta" (2026-08-07, Innovación Radical #4) —
// solo se ofrece para anuncios que (a) nacieron de un posteo orgánico vía
// "Publicitar un posteo" (ver ad_creative_origins, gate en ads-workspace.tsx)
// y (b) ya están en 'escalar' — cierra el círculo Ads→Contenido avisando
// qué tipo de post conviene repetir, en vez de que ese aprendizaje se
// pierda en el Administrador de Anuncios.
export function MarkWinnerButton({
  adId,
  adName,
  campaignName,
  roas,
  cpa,
}: {
  adId: string
  adName: string
  campaignName: string
  roas: number
  cpa: number
}) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleClick(event: React.MouseEvent) {
    event.stopPropagation()
    if (loading || done) return
    setLoading(true)
    const result = await markAdAsContentWinnerAction({ adId, adName, campaignName, roas, cpa })
    setLoading(false)
    if (!result.ok) {
      toast.show(result.error, 'error')
      return
    }
    setDone(true)
    toast.show('Le avisamos a Contenido — mirá Notas.', 'success')
  }

  if (done) {
    return (
      <span className="whitespace-nowrap rounded-full bg-accent/[0.08] px-2.5 py-1 text-[10px] font-bold text-accent">Avisado</span>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title="Avisarle a Contenido que este posteo orgánico funciona en pauta"
      className="whitespace-nowrap rounded-full bg-accent/[0.08] px-2.5 py-1 text-[10px] font-bold text-accent transition-all duration-150 ease-out hover:bg-accent/[0.14] disabled:cursor-wait disabled:opacity-60"
    >
      {loading ? 'Avisando…' : 'Avisar a Contenido'}
    </button>
  )
}
