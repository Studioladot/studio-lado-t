'use client'

import { CharCounterTextarea } from '@/components/features/char-counter-textarea'
import { TEXT_MAX_LENGTH } from '@/lib/text-limits'

// Piezas compartidas entre post-form.tsx (content/), add-piece-form.tsx y
// piece-edit-form.tsx (campaigns/[id]/) — limpieza de cierre de Fase 1
// (2026-08-06): los 3 formularios reimplementaban las mismas constantes,
// los mismos estilos y el mismo bloque de tabs Copy Instagram/TikTok
// palabra por palabra.
//
// A propósito NO se unifican los NOMBRES de campo (post-form usa
// title/format/platform/date/reference; los de campaña usan
// titulo/formato/plataforma/fecha_planificada/reference_files) — eso
// significaría tocar las Server Actions y el schema real de dos tablas
// distintas (content_posts/content_piezas) por una limpieza cosmética,
// mucho más riesgo que beneficio. Lo que se extrae acá es exactamente lo
// que YA era idéntico carácter por carácter: los valores posibles, el
// estilo de los campos, y el único bloque de JSX que no tenía ninguna
// diferencia entre los 3 (los nombres "caption"/"tiktok_caption" sí eran
// iguales en los 3 desde siempre).

export const FORMATOS = ['Reel', 'TikTok', 'Carrusel', 'Historia', 'Post', 'Video largo', 'Otro']
export const PLATAFORMAS = ['Instagram', 'TikTok', 'Ambas', 'YouTube']
export const TURNOS = ['Temprano', 'Tarde', 'Noche']

// Pipeline de producción (Épica Omnicanal, 2026-08-04) — separado a
// propósito del `status` legacy de content_posts (del que dependen las
// rachas de control-panel.tsx). Punto final del flujo de creación
// (decisión de producto, 2026-08-05): Gotix es planificación, no un
// programador de posteos.
export const PRODUCTION_STATUSES = [
  { value: 'idea', label: 'Idea' },
  { value: 'por_grabar', label: 'Por grabar' },
  { value: 'listo_para_programar', label: 'Listo para publicar' },
  { value: 'programado', label: 'Programado' },
  { value: 'publicado', label: 'Publicado' },
]

// Theme-aware — antes de la ronda del 2026-07-30 estos 3 archivos tenían
// hex hardcodeado (#D0D5DD/#F9FAFB/#101828) que rompía en dark mode.
export const fieldClass =
  'rounded-control border border-border bg-surface-2/60 px-3 py-2.5 text-sm text-text outline-none transition-all duration-200 ease-out placeholder:text-text-3 focus:border-accent focus-visible:ring-2 focus-visible:ring-accent'

export const labelClass = 'flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

export function ProductionStatusSelect({ defaultValue }: { defaultValue: string }) {
  return (
    <select name="production_status" defaultValue={defaultValue} className={`normal-case tracking-normal ${fieldClass}`}>
      {PRODUCTION_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  )
}

export function TurnoSelect({ defaultValue }: { defaultValue: string }) {
  return (
    <select name="turno" defaultValue={defaultValue} className={`normal-case tracking-normal ${fieldClass}`}>
      {TURNOS.map((t) => (
        <option key={t}>{t}</option>
      ))}
    </select>
  )
}

/** Tabs "Copy Instagram"/"Copy TikTok" — idéntico en los 3 formularios, campos `caption`/`tiktok_caption` ya se llamaban igual en los 3 desde siempre. */
export function NetworkCopyTabs({
  networkTab,
  onNetworkTabChange,
  captionDefault,
  tiktokCaptionDefault,
  instagramConnected,
  tiktokConnected,
}: {
  networkTab: 'instagram' | 'tiktok'
  onNetworkTabChange: (tab: 'instagram' | 'tiktok') => void
  captionDefault?: string | null
  tiktokCaptionDefault?: string | null
  instagramConnected: boolean
  tiktokConnected: boolean
}) {
  return (
    <>
      <div className="flex gap-1 rounded-control border border-border bg-surface-2/40 p-1">
        <button
          type="button"
          onClick={() => onNetworkTabChange('instagram')}
          className={`flex-1 rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
            networkTab === 'instagram' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
          }`}
        >
          Copy Instagram
        </button>
        <button
          type="button"
          onClick={() => onNetworkTabChange('tiktok')}
          className={`flex-1 rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
            networkTab === 'tiktok' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
          }`}
        >
          Copy TikTok
        </button>
      </div>

      <div className={networkTab === 'instagram' ? 'flex flex-col gap-2' : 'hidden'}>
        <label className={labelClass}>
          Copy (texto que se publica en Instagram)
          <CharCounterTextarea
            name="caption"
            rows={2}
            maxLength={TEXT_MAX_LENGTH}
            defaultValue={captionDefault}
            placeholder="El texto que va a acompañar la publicación — distinto de las notas internas de arriba."
            className={`resize-none normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        {!instagramConnected && (
          <p className="text-[11px] text-text-3">Conectá Instagram desde Ajustes → Integraciones para ver sus métricas acá más adelante.</p>
        )}
      </div>

      <div className={networkTab === 'tiktok' ? 'flex flex-col gap-2' : 'hidden'}>
        <label className={labelClass}>
          Copy (texto que se publica en TikTok)
          <CharCounterTextarea
            name="tiktok_caption"
            rows={2}
            maxLength={TEXT_MAX_LENGTH}
            defaultValue={tiktokCaptionDefault}
            placeholder="El texto que va a acompañar la publicación en TikTok."
            className={`resize-none normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        {!tiktokConnected && (
          <p className="text-[11px] text-text-3">Conectá TikTok desde Ajustes → Integraciones para ver sus métricas acá más adelante.</p>
        )}
      </div>
    </>
  )
}
