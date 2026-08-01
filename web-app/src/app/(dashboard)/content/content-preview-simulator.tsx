'use client'

import { useState } from 'react'

// Simulador Pixel-Perfect (Épica Omnicanal, 2026-08-04) — reemplaza el
// viejo "Reel de Prueba": la Graph API no deja previsualizar borradores de
// apps de terceros, así que esto es un entorno interno. Device-frame armado
// a mano con CSS (cero librería nueva, mismo criterio de siempre). Dos
// vistas: Feed/Reel (cómo se ve corriendo en el feed) y Grid/Perfil
// (recorte 1:1, para controlar el cover antes de publicar).
//
// Puramente presentacional a propósito: NO gestiona el ciclo de vida del
// object URL internamente (ni useEffect ni useState para eso) — el lint de
// este proyecto (react-hooks/set-state-in-effect) rechaza un setState
// síncrono dentro de un efecto, incluso para el caso legítimo de
// sincronizar con una API del navegador (URL.createObjectURL). El caller
// (post-form.tsx/add-piece-form.tsx) crea/revoca el object URL directo en
// el onChange del input de archivo — un event handler, no un efecto — y le
// pasa acá la URL ya resuelta.
//
// La foto de perfil/username son un placeholder genérico a propósito —
// hilar la cuenta real de Instagram/TikTok conectada hasta acá exigiría
// threadear esos 2 campos por toda la misma cadena de props que ya
// atraviesa `tiktokConnected` (5+ componentes); se deja para una iteración
// futura si hace falta el dato exacto, el mockup ya cumple su función real
// (controlar encuadre/recorte/longitud del caption) sin él.

type View = 'feed' | 'grid'

export function ContentPreviewSimulator({
  previewUrl,
  isVideo,
  caption,
}: {
  previewUrl: string | null
  isVideo: boolean
  caption: string
}) {
  const [view, setView] = useState<View>('feed')

  if (!previewUrl) return null

  return (
    <div className="rounded-control border border-border bg-surface-2/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">Vista previa</p>
        <div className="flex gap-1 rounded-control border border-border bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setView('feed')}
            className={`rounded-control px-2.5 py-1 text-[10px] font-semibold transition-colors duration-200 ease-out ${
              view === 'feed' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
            }`}
          >
            Feed / Reel
          </button>
          <button
            type="button"
            onClick={() => setView('grid')}
            className={`rounded-control px-2.5 py-1 text-[10px] font-semibold transition-colors duration-200 ease-out ${
              view === 'grid' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
            }`}
          >
            Grid / Perfil
          </button>
        </div>
      </div>

      {/* Device-frame — celular a mano, sin librería. */}
      <div className="mx-auto w-[220px] rounded-[28px] border-[6px] border-[#1a1a1a] bg-[#1a1a1a] shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
        <div className="relative overflow-hidden rounded-[22px] bg-black">
          <div className="absolute left-1/2 top-0 z-10 h-4 w-20 -translate-x-1/2 rounded-b-2xl bg-[#1a1a1a]" aria-hidden="true" />

          {view === 'feed' ? (
            <div className="relative aspect-[9/16] w-full">
              {isVideo ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption -- preview interno, sin audio relevante para subtítulos.
                <video src={previewUrl} className="h-full w-full object-cover" autoPlay loop muted playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- object URL local / archivo ya subido, no next/image.
                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-x-0 top-6 flex items-center gap-1.5 px-2.5">
                <div className="h-6 w-6 shrink-0 rounded-full border border-white/70 bg-white/20" aria-hidden="true" />
                <span className="text-[10px] font-semibold text-white drop-shadow">tu_cuenta</span>
              </div>
              <div className="absolute inset-x-0 bottom-2 px-2.5">
                <p className="line-clamp-2 text-[10px] leading-snug text-white drop-shadow">{caption || 'Sin caption todavía…'}</p>
              </div>
            </div>
          ) : (
            <div className="grid aspect-[9/16] w-full grid-cols-3 gap-[1px] bg-black">
              <div className="relative col-span-3 row-span-1 aspect-square">
                {isVideo ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={previewUrl} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute right-1 top-1 rounded bg-black/50 px-1 text-[8px] font-bold text-white">1:1</span>
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-white/5" aria-hidden="true" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
