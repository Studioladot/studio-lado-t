'use client'

import { useMemo, useState, useTransition } from 'react'
import { syncTiktokVideosAction } from './tiktok-sync-actions'
import { crossPostTiktokVideoAction } from './tiktok-cross-post-actions'
import { TiktokVideoDetailModal } from './tiktok-video-detail-modal'
import { Pagination } from '../meta-ads/campaigns/pagination'
import { detectTiktokWinners, type TiktokVideoRow } from '@/lib/tiktok/winners'
import { TiktokIcon } from '@/components/features/nav-icons'

function fmt(n: number): string {
  return n.toLocaleString('es-AR')
}

type SortMode = 'views' | 'recent' | 'likes' | 'comments'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'views', label: 'Más vistas' },
  { value: 'recent', label: 'Más recientes' },
  { value: 'likes', label: 'Más likes' },
  { value: 'comments', label: 'Más comentarios' },
]

const PAGE_SIZE = 12

function sortVideos(videos: TiktokVideoRow[], mode: SortMode): TiktokVideoRow[] {
  const sorted = [...videos]
  switch (mode) {
    case 'recent':
      return sorted.sort((a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? ''))
    case 'likes':
      return sorted.sort((a, b) => b.like_count - a.like_count)
    case 'comments':
      return sorted.sort((a, b) => b.comment_count - a.comment_count)
    case 'views':
    default:
      return sorted.sort((a, b) => b.view_count - a.view_count)
  }
}

// Sección "Rendimiento TikTok" (Fase 1 del Hub Omnicanal, 2026-08-01;
// rediseño 2026-08-01) — grilla compacta con sort + paginación real (no
// renderiza el historial entero de una), y un modal de detalle para la
// analítica profunda en vez de sobrecargar la tarjeta principal.
export function TiktokPerformanceSection({ videos }: { videos: TiktokVideoRow[] }) {
  const [syncing, startSync] = useTransition()
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('views')
  const [page, setPage] = useState(1)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [escalatingId, setEscalatingId] = useState<string | null>(null)
  const [escalateResults, setEscalateResults] = useState<Record<string, { ok: boolean; message: string }>>({})

  const winners = useMemo(() => detectTiktokWinners(videos), [videos])
  const sorted = useMemo(() => sortVideos(videos, sortMode), [videos, sortMode])
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const maxViews = useMemo(() => Math.max(1, ...videos.map((v) => v.view_count)), [videos])
  const maxLikes = useMemo(() => Math.max(1, ...videos.map((v) => v.like_count)), [videos])
  const maxComments = useMemo(() => Math.max(1, ...videos.map((v) => v.comment_count)), [videos])
  const maxShares = useMemo(() => Math.max(1, ...videos.map((v) => v.share_count)), [videos])

  const selectedVideo = videos.find((v) => v.id === selectedVideoId) ?? null

  function handleSortChange(mode: SortMode) {
    setSortMode(mode)
    setPage(1)
  }

  function handleSync() {
    setSyncError(null)
    setSyncMessage(null)
    startSync(async () => {
      const result = await syncTiktokVideosAction()
      if (!result.ok) {
        setSyncError(result.error)
        return
      }
      setSyncMessage(result.count === 0 ? 'No encontramos videos nuevos.' : `Sincronizados ${result.count} videos.`)
    })
  }

  async function handleEscalate(videoId: string) {
    setEscalatingId(videoId)
    const result = await crossPostTiktokVideoAction(videoId)
    setEscalatingId(null)
    setEscalateResults((prev) => ({
      ...prev,
      [videoId]: result.ok
        ? {
            ok: true,
            message: result.hasMedia
              ? 'Borrador creado en Publicaciones, listo para programar.'
              : 'Borrador creado — subí el archivo a mano desde Publicaciones, TikTok no nos dejó traerlo automáticamente.',
          }
        : { ok: false, message: result.error },
    }))
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TiktokIcon size={16} />
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Rendimiento TikTok</p>
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
        <p className="text-xs text-text-3">Todavía no sincronizaste tu historial de TikTok — tocá &ldquo;Sincronizar ahora&rdquo;.</p>
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
            <p className="text-[10px] text-text-3">{sorted.length} videos</p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {pageItems.map((v) => {
              const isWinner = winners.has(v.id)
              const busy = escalatingId === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVideoId(v.id)}
                  className="group flex flex-col overflow-hidden rounded-control border border-border bg-surface-2/40 text-left transition-all duration-200 ease-out hover:border-text-3"
                >
                  <div className="relative aspect-[3/4] w-full bg-black">
                    {v.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- thumbnail remoto de TikTok, no un asset local.
                      <img src={v.cover_image_url} alt="" className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-text-3">
                        <TiktokIcon size={18} />
                      </div>
                    )}
                    {isWinner && (
                      <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white shadow">
                        Viral
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-3 text-[10px] font-semibold tabular-nums text-white">
                      {fmt(v.view_count)}
                    </span>
                  </div>
                  <p className="line-clamp-2 px-1.5 py-1.5 text-[10px] leading-snug text-text-2">{v.description || 'Sin descripción'}</p>
                  {escalateResults[v.id] && (
                    <p className={`px-1.5 pb-1.5 text-[9px] ${escalateResults[v.id].ok ? 'text-green' : 'text-red'}`}>
                      {escalateResults[v.id].ok ? 'Escalado ✓' : 'Error'}
                    </p>
                  )}
                  {busy && <p className="px-1.5 pb-1.5 text-[9px] text-text-3">Escalando…</p>}
                </button>
              )
            })}
          </div>

          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {selectedVideo && (
        <TiktokVideoDetailModal
          video={selectedVideo}
          maxViews={maxViews}
          maxLikes={maxLikes}
          maxComments={maxComments}
          maxShares={maxShares}
          escalating={escalatingId === selectedVideo.id}
          escalateMessage={escalateResults[selectedVideo.id]?.message ?? null}
          onClose={() => setSelectedVideoId(null)}
          onEscalate={() => handleEscalate(selectedVideo.id)}
        />
      )}
    </div>
  )
}
