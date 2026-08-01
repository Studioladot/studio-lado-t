'use client'

import { useMemo, useState, useTransition } from 'react'
import { syncInstagramMediaAction } from './instagram-sync-actions'
import { InstagramMediaDetailModal } from './instagram-media-detail-modal'
import { Pagination } from '../meta-ads/campaigns/pagination'
import { detectInstagramCatalogWinners, primaryMetric, formatLabel, type InstagramCatalogRow } from '@/lib/instagram/media-catalog-winners'
import { InstagramIcon } from '@/components/features/nav-icons'

function fmt(n: number): string {
  return n.toLocaleString('es-AR')
}

type SortMode = 'primary' | 'recent' | 'likes' | 'comments'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'primary', label: 'Más vistas' },
  { value: 'recent', label: 'Más recientes' },
  { value: 'likes', label: 'Más likes' },
  { value: 'comments', label: 'Más comentarios' },
]

const PAGE_SIZE = 12

function sortItems(items: InstagramCatalogRow[], mode: SortMode): InstagramCatalogRow[] {
  const sorted = [...items]
  switch (mode) {
    case 'recent':
      return sorted.sort((a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? ''))
    case 'likes':
      return sorted.sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))
    case 'comments':
      return sorted.sort((a, b) => (b.comments_count ?? 0) - (a.comments_count ?? 0))
    case 'primary':
    default:
      return sorted.sort((a, b) => primaryMetric(b) - primaryMetric(a))
  }
}

// Catálogo "zero fricción" del feed histórico de Instagram (Panel de
// Inteligencia de Contenido, 2026-08-01) — mismo tratamiento visual que
// tiktok-performance-section.tsx (grilla compacta, sort, paginación real,
// modal de detalle) a propósito, para que las dos plataformas se sientan
// como el mismo producto. Sin botón de "Escalar": el contenido ya está en
// Instagram, no tiene destino al que cross-postear todavía.
export function InstagramMediaCatalogSection({
  items,
  gotixMediaIds,
}: {
  items: InstagramCatalogRow[]
  gotixMediaIds: Set<string>
}) {
  const [syncing, startSync] = useTransition()
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('primary')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const winners = useMemo(() => detectInstagramCatalogWinners(items), [items])
  const sorted = useMemo(() => sortItems(items, sortMode), [items, sortMode])
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const maxPrimary = useMemo(() => Math.max(1, ...items.map(primaryMetric)), [items])
  const maxLikes = useMemo(() => Math.max(1, ...items.map((i) => i.like_count ?? 0)), [items])
  const maxComments = useMemo(() => Math.max(1, ...items.map((i) => i.comments_count ?? 0)), [items])

  const selectedItem = items.find((i) => i.id === selectedId) ?? null

  function handleSortChange(mode: SortMode) {
    setSortMode(mode)
    setPage(1)
  }

  function handleSync() {
    setSyncError(null)
    setSyncMessage(null)
    startSync(async () => {
      const result = await syncInstagramMediaAction()
      if (!result.ok) {
        setSyncError(result.error)
        return
      }
      const notes: string[] = []
      if (result.withoutInsights > 0) {
        notes.push(`${result.withoutInsights} sin impresiones/reproducciones`)
      }
      if (result.withoutLikeData > 0) {
        notes.push(`${result.withoutLikeData} sin likes/comentarios (Meta no los devolvió para esos posts)`)
      }
      const insightsNote = notes.length > 0 ? ` (${notes.join(', ')}.)` : ''
      if (result.count === 0 && result.done) {
        setSyncMessage('Historial completo — no hay nada nuevo para traer.')
      } else if (result.done) {
        setSyncMessage(`Sincronizados ${result.count} — historial completo.${insightsNote}`)
      } else {
        setSyncMessage(`Sincronizados ${result.count} — todavía queda historial. Tocá "Sincronizar ahora" de nuevo para seguir.${insightsNote}`)
      }
    })
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <InstagramIcon size={16} gradient />
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Catálogo Instagram</p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="rounded-control border border-border px-3 py-1.5 text-[11px] font-semibold text-text-2 transition-all duration-200 ease-out hover:border-text-3 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
      </div>

      {syncError && <p className="mb-3 text-xs text-red">{syncError}</p>}
      {syncMessage && <p className="mb-3 text-xs text-green">{syncMessage}</p>}

      {sorted.length === 0 ? (
        <p className="text-xs text-text-3">
          Todavía no sincronizaste tu historial de Instagram — tocá &ldquo;Sincronizar ahora&rdquo;. Cuentas grandes pueden necesitar varios clics
          (cada uno trae un lote).
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 rounded-control border border-border bg-surface-2/40 p-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSortChange(opt.value)}
                  className={`rounded-control px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200 ease-out ${
                    sortMode === opt.value ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-text-3">{sorted.length} publicaciones</p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {pageItems.map((item) => {
              const isWinner = winners.has(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className="group flex flex-col overflow-hidden rounded-control border border-border bg-surface-2/40 text-left transition-all duration-200 ease-out hover:border-text-3"
                >
                  <div className="relative aspect-[3/4] w-full bg-black">
                    {item.thumbnail_url || item.media_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- thumbnail remoto de Instagram, no un asset local.
                      <img
                        src={item.thumbnail_url ?? item.media_url ?? undefined}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-text-3">
                        <InstagramIcon size={18} />
                      </div>
                    )}
                    {isWinner && (
                      <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white shadow">
                        Viral
                      </span>
                    )}
                    <span className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white shadow">
                      {formatLabel(item)}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-3 text-[10px] font-semibold tabular-nums text-white">
                      {fmt(primaryMetric(item))}
                    </span>
                  </div>
                  <p className="line-clamp-2 px-1.5 py-1.5 text-[10px] leading-snug text-text-2">{item.caption || 'Sin descripción'}</p>
                  {item.ig_media_id && gotixMediaIds.has(item.ig_media_id) && (
                    <span className="mx-1.5 mb-1.5 w-fit rounded-full bg-accent/[0.12] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-accent">
                      Publicado con Gotix
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {selectedItem && (
        <InstagramMediaDetailModal
          item={selectedItem}
          maxPrimary={maxPrimary}
          maxLikes={maxLikes}
          maxComments={maxComments}
          publishedWithGotix={!!selectedItem.ig_media_id && gotixMediaIds.has(selectedItem.ig_media_id)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
