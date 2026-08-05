'use client'

import { useEffect } from 'react'

// Diagnóstico temporal (2026-08-06) — Next.js en producción oculta el
// mensaje real de cualquier excepción de Server Component por seguridad
// (solo muestra un genérico "Application error"), así que un crash acá es
// invisible tanto para el usuario como para mí sin este boundary. Cubre
// /campaigns, /campaigns/[id] y /campaigns/new (aplica a todo el segmento
// y sus hijos). Se puede sacar una vez identificada la causa real.
export default function CampaignsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[CampaignsError] excepción real en el segmento /campaigns:', error)
  }, [error])

  return (
    <div className="mx-auto max-w-[640px] py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-red">Error en Campañas</p>
      <h1 className="mt-2 text-lg font-semibold text-text">Algo salió mal al cargar esta página</h1>
      <p className="mt-1 text-xs text-text-2">
        Mandame una captura de este cuadro — es el mensaje real del error, no un genérico.
      </p>
      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-control border border-border bg-surface-2/60 p-4 text-left text-xs text-text-2">
        {error.message || 'Sin mensaje.'}
        {error.digest ? `\n\nDigest: ${error.digest}` : ''}
        {error.stack ? `\n\n${error.stack}` : ''}
      </pre>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-control bg-primary px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
      >
        Reintentar
      </button>
    </div>
  )
}
