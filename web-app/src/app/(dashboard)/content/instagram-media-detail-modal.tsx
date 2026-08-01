'use client'

import { InstagramIcon } from '@/components/features/nav-icons'
import { primaryMetric, type InstagramCatalogRow } from '@/lib/instagram/media-catalog-winners'

function fmt(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('es-AR')
}

function Bar({ label, value, max }: { label: string; value: number | null; max: number }) {
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

// "Arquitectura del Santo Grial" (2026-08-01) — Ventas atribuidas/ROAS
// orgánico/Clics al link quedan como placeholder explícito, nunca en 0 ni
// inventados: hoy no hay ningún cruce con Tiendanube/WhatsApp que pueda
// llenarlos. attributedSales/roasOrganic/linkClicks vienen de las
// columnas ya reservadas en la migración — si en algún momento la próxima
// fase las completa, esta misma UI ya las va a mostrar sin tocar nada acá.
function SalesAttributionRow({
  attributedSales,
  roasOrganic,
  linkClicks,
}: {
  attributedSales: number | null
  roasOrganic: number | null
  linkClicks: number | null
}) {
  const hasData = attributedSales !== null || roasOrganic !== null || linkClicks !== null
  return (
    <div className="rounded-control border border-dashed border-accent/30 bg-accent/[0.03] p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-3">Impacto en ventas</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-sm font-bold tabular-nums text-text">{attributedSales !== null ? fmt(attributedSales) : '—'}</p>
          <p className="mt-0.5 text-[9px] text-text-3">Ventas atrib.</p>
        </div>
        <div>
          <p className="text-sm font-bold tabular-nums text-text">{roasOrganic !== null ? `${roasOrganic.toFixed(1)}x` : '—'}</p>
          <p className="mt-0.5 text-[9px] text-text-3">ROAS orgánico</p>
        </div>
        <div>
          <p className="text-sm font-bold tabular-nums text-text">{linkClicks !== null ? fmt(linkClicks) : '—'}</p>
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

export function InstagramMediaDetailModal({
  item,
  maxPrimary,
  maxLikes,
  maxComments,
  onClose,
}: {
  item: InstagramCatalogRow
  maxPrimary: number
  maxLikes: number
  maxComments: number
  onClose: () => void
}) {
  const engagementBase = item.plays ?? item.impressions ?? item.reach ?? 0
  const engagementRate = engagementBase > 0 ? (((item.like_count ?? 0) + (item.comments_count ?? 0) + (item.saved ?? 0)) / engagementBase) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-[440px] overflow-y-auto rounded-card border border-border bg-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[3/4] max-h-[280px] w-full bg-black">
          {item.thumbnail_url || item.media_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen remota de Instagram, no un asset local.
            <img src={item.thumbnail_url ?? item.media_url ?? undefined} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-text-3">
              <InstagramIcon size={28} />
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
          <p className="text-sm leading-relaxed text-text">{item.caption || 'Sin descripción'}</p>

          <div className="flex flex-col gap-2.5">
            <Bar label={item.plays !== null ? 'Reproducciones' : 'Impresiones'} value={primaryMetric(item)} max={maxPrimary} />
            <Bar label="Likes" value={item.like_count} max={maxLikes} />
            <Bar label="Comentarios" value={item.comments_count} max={maxComments} />
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-control border border-border bg-border">
            <div className="bg-surface px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Tasa de interacción</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-text">{engagementRate.toFixed(1)}%</p>
            </div>
            <div className="bg-surface px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Publicado</p>
              <p className="mt-0.5 text-sm text-text">{item.posted_at ? new Date(item.posted_at).toLocaleDateString('es-AR') : '—'}</p>
            </div>
          </div>

          <SalesAttributionRow attributedSales={item.attributed_sales} roasOrganic={item.roas_organic} linkClicks={item.link_clicks} />

          {item.permalink && (
            <a href={item.permalink} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent transition-colors duration-200 ease-out hover:text-accent/80">
              Ver en Instagram →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
