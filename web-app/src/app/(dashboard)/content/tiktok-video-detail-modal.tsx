'use client'

import { TiktokIcon } from '@/components/features/nav-icons'
import type { TiktokVideoRow } from '@/lib/tiktok/winners'

function fmt(n: number): string {
  return n.toLocaleString('es-AR')
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-text-2">{label}</span>
        <span className="font-semibold tabular-nums text-text">{fmt(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-all duration-300 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Modal de "Analítica Profunda" (2026-08-01) — las barras comparan cada
// métrica contra el máximo de TODO el historial sincronizado (no solo la
// página visible), para que el contexto no cambie según en qué página de
// la grilla estés parado.
//
// Honestidad deliberada sobre un límite real: seguidores nuevos, alcance a
// no-seguidores y demografía NO están acá, ni van a estar con un ajuste de
// scopes — la Display API de TikTok (Login Kit, lo que tiene esta app) no
// expone esos datos a terceros; TikTok los reserva para su propia app
// TikTok Studio. Conseguirlos necesitaría el programa de TikTok Business/
// Ads API, una integración aparte con su propia revisión — no algo que se
// resuelva agregando un string de scope acá. Mejor decir esto claro que
// inventar números o romper el login actual pidiendo un scope que la app
// no tiene aprobado.
export function TiktokVideoDetailModal({
  video,
  maxViews,
  maxLikes,
  maxComments,
  maxShares,
  onClose,
  onEscalate,
  escalating,
  escalateMessage,
}: {
  video: TiktokVideoRow
  maxViews: number
  maxLikes: number
  maxComments: number
  maxShares: number
  onClose: () => void
  onEscalate: () => void
  escalating: boolean
  escalateMessage: string | null
}) {
  const engagementRate = video.view_count > 0 ? ((video.like_count + video.comment_count + video.share_count) / video.view_count) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-[440px] overflow-y-auto rounded-card border border-border bg-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[3/4] max-h-[280px] w-full bg-black">
          {video.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- thumbnail remoto de TikTok, no un asset local.
            <img src={video.cover_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-text-3">
              <TiktokIcon size={28} />
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors duration-200 ease-out hover:bg-black/70"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm leading-relaxed text-text">{video.description || 'Sin descripción'}</p>

          <div className="flex flex-col gap-2.5">
            <Bar label="Vistas" value={video.view_count} max={maxViews} />
            <Bar label="Likes" value={video.like_count} max={maxLikes} />
            <Bar label="Comentarios" value={video.comment_count} max={maxComments} />
            <Bar label="Compartidos" value={video.share_count} max={maxShares} />
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-control border border-border bg-border">
            <div className="bg-surface px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Tasa de interacción</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-text">{engagementRate.toFixed(1)}%</p>
            </div>
            <div className="bg-surface px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Publicado</p>
              <p className="mt-0.5 text-sm text-text">{video.posted_at ? new Date(video.posted_at).toLocaleDateString('es-AR') : '—'}</p>
            </div>
          </div>

          <div className="rounded-control border border-dashed border-border bg-surface-2/40 p-3 text-[11px] leading-relaxed text-text-3">
            Seguidores nuevos, alcance a no-seguidores y demografía (género/edad) no están disponibles con el acceso actual a la API de TikTok — esos
            datos los reserva TikTok para su propia app (TikTok Studio) y requerirían el programa de TikTok Business/Ads API, una integración aparte
            con su propia revisión, para poder mostrarlos acá.
          </div>

          <div className="flex items-center gap-3">
            {video.share_url && (
              <a href={video.share_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent transition-colors duration-200 ease-out hover:text-accent/80">
                Ver en TikTok →
              </a>
            )}
            <button
              type="button"
              onClick={onEscalate}
              disabled={escalating}
              className="ml-auto rounded-control bg-primary px-3.5 py-2 text-xs font-bold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {escalating ? 'Escalando…' : 'Escalar a Instagram'}
            </button>
          </div>
          {escalateMessage && <p className="text-[11px] text-text-2">{escalateMessage}</p>}
        </div>
      </div>
    </div>
  )
}
