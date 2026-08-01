'use client'

import { isOverdueScheduled, type UnifiedItem } from './unified-items'
import type { MediaInsight } from './content-tabs'

// "Ver" — vista de solo lectura pedida explícitamente por la PO: antes el
// modal de día del Calendario solo tenía Editar/Eliminar, sin forma de leer
// el copy completo, las notas internas y las métricas sin arriesgarse a
// tocar algo por accidente (Editar es un formulario, esto no tiene ningún
// input). Las métricas se buscan en `mediaInsights` por id+tabla — mismo
// dato ya cacheado que alimenta Rendimiento/Comparativa, nunca un fetch
// nuevo acá.

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Programado', className: 'border-accent/40 bg-accent/[8%] text-accent' },
  publishing: { label: 'Publicando…', className: 'border-amber/40 bg-amber/[8%] text-amber' },
  published: { label: 'Publicado', className: 'border-green/40 bg-green/[8%] text-green' },
  failed: { label: 'Error', className: 'border-red/40 bg-red/[8%] text-red' },
}

function fmt(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : n.toLocaleString('es-AR')
}

export function ItemViewModal({
  item,
  mediaInsights,
  onClose,
}: {
  item: UnifiedItem
  mediaInsights: MediaInsight[]
  onClose: () => void
}) {
  const metrics = mediaInsights.find((m) => (item.sourceTable === 'content_piezas' ? m.piece_id === item.id : m.post_id === item.id))
  const overdue = isOverdueScheduled(item)
  const badge = STATUS_BADGE[item.publishStatus]
  const media = item.mediaList[0] ?? (item.mediaUrl ? { url: item.mediaUrl, type: (item.mediaType as 'image' | 'video') ?? 'image' } : null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-[520px] flex-col overflow-hidden rounded-card border border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-sm font-bold text-text">{item.titulo || 'Sin título'}</p>
            {badge && (
              <span
                title={overdue ? 'Pasó la hora programada y todavía no se publicó — puede ser el límite diario de Instagram (25 posts/24h) u otro problema de conexión.' : undefined}
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${overdue ? 'border-red/40 bg-red/[8%] text-red' : badge.className}`}
              >
                {overdue ? 'Demorado' : badge.label}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-text-3 transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {media && (
            <div className="mb-4 overflow-hidden rounded-control border border-border bg-surface-2">
              {media.type === 'video' ? (
                <video src={media.url} controls className="max-h-[280px] w-full object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.url} alt="" className="max-h-[280px] w-full object-contain" />
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-3">
            {item.date && <span className="tabular-nums">{item.date}</span>}
            {item.platform && <span>· {item.platform}</span>}
            {item.format && <span>· {item.format}</span>}
            {item.source === 'campana' && (
              <span style={{ color: item.campaignColor }}>· {item.campaignName}</span>
            )}
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Copy (texto publicado)</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text">{item.caption || 'Sin copy cargado.'}</p>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Notas internas (no se publican)</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text-2">{item.internalNotes || 'Sin notas.'}</p>
          </div>

          {item.igPermalink && (
            <a
              href={item.igPermalink}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-xs font-medium text-green transition-colors duration-200 ease-out hover:text-green/80"
            >
              Ver en Instagram ↗
            </a>
          )}

          {item.publishStatus === 'failed' && item.publishError && (
            <p className="mt-3 text-xs text-red">Último error: {item.publishError}</p>
          )}

          {metrics && (
            <div className="mt-5 border-t border-divider pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Métricas (Instagram)</p>
                {metrics.ig_media_id && <span className="font-mono text-[9px] text-text-3">#{metrics.ig_media_id.slice(-6)}</span>}
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <MetricStat label="Plays" value={fmt(metrics.plays)} />
                <MetricStat label="Alcance" value={fmt(metrics.reach)} />
                <MetricStat label="Likes" value={fmt(metrics.likes)} />
                <MetricStat label="Coment." value={fmt(metrics.comments)} />
                <MetricStat label="Compart." value={fmt(metrics.shares)} />
                <MetricStat label="Guard." value={fmt(metrics.saves)} />
              </div>
              <p className="mt-2 text-[10px] text-text-3">Al {metrics.captured_at} — se sincroniza una vez al día.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control border border-border bg-surface-2/40 px-2.5 py-2 text-center">
      <p className="text-sm font-bold tabular-nums text-text">{value}</p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wide text-text-3">{label}</p>
    </div>
  )
}
