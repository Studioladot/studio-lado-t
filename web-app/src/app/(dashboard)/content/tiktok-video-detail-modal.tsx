'use client'

import Link from 'next/link'
import { TiktokIcon } from '@/components/features/nav-icons'
import type { TiktokVideoRow } from '@/lib/tiktok/winners'

// Bug real reportado (2026-08-01): crash en producción con "This page
// couldn't load" al abrir el modal. Causa: attributed_sales/roas_organic/
// link_clicks son columnas nuevas (migración 20260805130000) — si esa
// migración todavía no corrió contra la base, Supabase devuelve las filas
// SIN esas claves en vez de con null, así que en runtime valen `undefined`
// aunque el tipo generado diga `number | null`. fmt(undefined) tiraba
// "Cannot read properties of undefined" — acá y en el resto del archivo,
// todo lo que puede venir de una columna nueva ahora acepta también
// undefined explícitamente, no solo null.
function fmt(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : n.toLocaleString('es-AR')
}

function Bar({ label, value, max }: { label: string; value: number | null | undefined; max: number }) {
  const v = value ?? 0
  const pct = max > 0 ? Math.min(100, (v / max) * 100) : 0
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

// "Arquitectura del Santo Grial" (2026-08-01) — mismo bloque que
// instagram-media-detail-modal.tsx, a propósito: las dos plataformas
// quedan con la misma forma para cuando exista el cruce real con
// Tiendanube/WhatsApp. Nunca en 0 ni inventado, siempre "—" hasta que
// haya un dato real.
function SalesAttributionRow({
  attributedSales,
  roasOrganic,
  linkClicks,
}: {
  attributedSales: number | null | undefined
  roasOrganic: number | null | undefined
  linkClicks: number | null | undefined
}) {
  const hasData = attributedSales != null || roasOrganic != null || linkClicks != null
  return (
    <div className="rounded-control border border-dashed border-accent/30 bg-accent/[0.03] p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-3">Impacto en ventas</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-sm font-bold tabular-nums text-text">{fmt(attributedSales)}</p>
          <p className="mt-0.5 text-[9px] text-text-3">Ventas atrib.</p>
        </div>
        <div>
          <p className="text-sm font-bold tabular-nums text-text">{roasOrganic != null ? `${roasOrganic.toFixed(1)}x` : '—'}</p>
          <p className="mt-0.5 text-[9px] text-text-3">ROAS orgánico</p>
        </div>
        <div>
          <p className="text-sm font-bold tabular-nums text-text">{fmt(linkClicks)}</p>
          <p className="mt-0.5 text-[9px] text-text-3">Clics al link</p>
        </div>
      </div>
      {!hasData && (
        <p className="mt-2 text-[10px] leading-relaxed text-text-3">
          Todavía no hay conexión con Tiendanube/WhatsApp para atribuir ventas a este contenido — próxima fase.
        </p>
      )}
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
  escalateResult,
}: {
  video: TiktokVideoRow
  maxViews: number
  maxLikes: number
  maxComments: number
  maxShares: number
  onClose: () => void
  onEscalate: () => void
  escalating: boolean
  escalateResult: { ok: boolean; message: string } | null
}) {
  const viewCount = video.view_count ?? 0
  const engagementRate = viewCount > 0 ? (((video.like_count ?? 0) + (video.comment_count ?? 0) + (video.share_count ?? 0)) / viewCount) * 100 : 0

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

          <SalesAttributionRow attributedSales={video.attributed_sales} roasOrganic={video.roas_organic} linkClicks={video.link_clicks} />

          {/* Banner con color, no un texto gris chico — antes era fácil no
              notar que la acción sí había terminado (reporte real: "hace
              la animación de cargar pero no hace nada más"). */}
          {escalateResult && (
            <div
              className={`rounded-control border px-3 py-2.5 text-xs ${
                escalateResult.ok ? 'border-green/30 bg-green/[8%] text-green' : 'border-red/30 bg-red/[8%] text-red'
              }`}
            >
              {escalateResult.message}
              {escalateResult.ok && (
                <Link href="/content" className="ml-1.5 font-semibold underline">
                  Ver en Publicaciones →
                </Link>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            {video.share_url && (
              <a href={video.share_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent transition-colors duration-200 ease-out hover:text-accent/80">
                Ver en TikTok →
              </a>
            )}
            <button
              type="button"
              onClick={onEscalate}
              disabled={escalating || escalateResult?.ok}
              className="ml-auto rounded-control bg-primary px-3.5 py-2 text-xs font-bold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {escalating ? 'Escalando…' : escalateResult?.ok ? 'Ya escalado ✓' : 'Escalar a Instagram'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
