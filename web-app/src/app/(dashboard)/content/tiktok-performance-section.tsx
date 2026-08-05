'use client'

import { useId, useMemo, useState, useTransition } from 'react'
import { syncTiktokVideosAction } from './tiktok-sync-actions'
import { crossPostTiktokVideoAction } from './tiktok-cross-post-actions'
import { TiktokVideoDetailModal } from './tiktok-video-detail-modal'
import { TiktokComparisonPanel } from './tiktok-comparison-panel'
import { TiktokOverviewKpis } from './tiktok-overview-kpis'
import { TiktokDayOfWeekChart } from './tiktok-day-of-week-chart'
import { DateRangePicker } from './date-range-picker'
import { Pagination } from '../meta-ads/campaigns/pagination'
import { detectTiktokWinners, interactionsTotal, formatDuration, type TiktokVideoRow } from '@/lib/tiktok/winners'
import { computeTiktokOverviewKpis } from '@/lib/tiktok/overview'
import { DATE_RANGE_OPTIONS, filterByDateRange, type DateRangeMode } from '@/lib/date-range'
import { fmtCompactCount } from '@/lib/format/number'
import { TiktokIcon } from '@/components/features/nav-icons'

// Rediseño "Paridad de Plataformas" (2026-08-06) — réplica estructural y
// visual de la sección de Instagram: mismo diseño de tarjetas KPI, misma
// grilla premium con overlays sutiles (ojo+corazón, badge de formato —
// acá duración del video, no Reel/Carrusel), mismos filtros pill, mismo
// panel lateral de resumen, mismo modo de comparación. Adaptado a lo que
// la Display API de TikTok realmente entrega: sin reach/impresiones
// separados, sin serie de cuenta (por eso no hay gráficos de evolución de
// alcance/seguidores acá, ver reporte de auditoría) y sin filtros de
// tipo de contenido (todo es video). El botón de "Escalar a Instagram"
// sigue viviendo en el modal — Instagram no tiene su equivalente porque
// ese contenido ya nació ahí.

function EyeIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 9S4.5 4 9 4s7.5 5 7.5 5-3 5-7.5 5-7.5-5-7.5-5Z" />
      <circle cx="9" cy="9" r="2" />
    </svg>
  )
}

function HeartIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 15.5S2.25 11.1 2.25 6.6A3.35 3.35 0 0 1 9 5.3a3.35 3.35 0 0 1 6.75 1.3C15.75 11.1 9 15.5 9 15.5Z" />
    </svg>
  )
}

function CalendarIcon({ size = 9 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.25" y="3.5" width="13.5" height="12" rx="1.75" />
      <path d="M2.25 7.25h13.5M6 2v3M12 2v3" />
    </svg>
  )
}

function ClockIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="7" />
      <path d="M9 5.5v4l2.75 1.75" />
    </svg>
  )
}

function CommentIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4.25h12a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H8.25L4.5 15.5v-2.75H3a1 1 0 0 1-1-1v-6.5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

function StarIcon({ size = 8 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="currentColor" stroke="none">
      <path d="M9 1.5l2.27 4.86 5.23.72-3.8 3.77.9 5.4L9 13.7l-4.6 2.55.9-5.4-3.8-3.77 5.23-.72L9 1.5Z" />
    </svg>
  )
}

function CheckIcon({ size = 8 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5l3.2 3.2L14.5 5.5" />
    </svg>
  )
}

function CompareIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="6" height="12" rx="1.5" />
      <rect x="10" y="3" width="6" height="12" rx="1.5" />
    </svg>
  )
}

type SortMode = 'views' | 'recent' | 'likes' | 'comments'

const SORT_OPTIONS: { value: SortMode; label: string; Icon: (props: { size?: number }) => React.JSX.Element }[] = [
  { value: 'views', label: 'Más vistas', Icon: EyeIcon },
  { value: 'recent', label: 'Más recientes', Icon: ClockIcon },
  { value: 'likes', label: 'Más likes', Icon: HeartIcon },
  { value: 'comments', label: 'Más comentarios', Icon: CommentIcon },
]

const PAGE_SIZE = 24
const MAX_COMPARE = 4

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

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= maxWords) return text.trim()
  return `${words.slice(0, maxWords).join(' ')}…`
}

function formatPostedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

// Mismo trazo que EvolutionSparkline de Instagram (operations/sales/sparkline.tsx en origen).
function EvolutionSparkline({ series }: { series: number[] }) {
  const gradientId = `tiktok-spark-${useId()}`
  const width = 148
  const height = 34
  if (series.length < 2) {
    return <p className="text-[10px] text-text-3">Todavía no hay suficientes videos con fecha para graficar la evolución.</p>
  }

  const pad = 2
  const max = Math.max(...series, 0.0001)
  const min = Math.min(...series, 0)
  const range = max - min || 1
  const stepX = (width - pad * 2) / (series.length - 1)
  const points = series.map((v, i) => {
    const x = pad + i * stepX
    const y = height - pad - ((v - min) / range) * (height - pad * 2)
    return [x, y] as const
  })
  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${height} L${points[0][0].toFixed(1)},${height} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TiktokSummaryCard({ videos }: { videos: TiktokVideoRow[] }) {
  const totalViews = videos.reduce((sum, v) => sum + v.view_count, 0)
  const avgViews = videos.length > 0 ? totalViews / videos.length : null

  const series = [...videos]
    .filter((v) => v.posted_at)
    .sort((a, b) => (a.posted_at ?? '').localeCompare(b.posted_at ?? ''))
    .slice(-20)
    .map((v) => v.view_count)

  return (
    <div className="flex h-fit flex-col gap-4 rounded-control border border-border bg-surface-2/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Resumen del conjunto</p>
      <div>
        <p className="text-[10px] font-medium text-text-3">Vistas totales</p>
        <p className="mt-0.5 text-xl font-extrabold tabular-nums text-text">{fmtCompactCount(totalViews)}</p>
      </div>
      <div>
        <p className="text-[10px] font-medium text-text-3">Promedio por video</p>
        <p className="mt-0.5 text-base font-bold tabular-nums text-text">{fmtCompactCount(avgViews)}</p>
      </div>
      <div>
        <p className="mb-1.5 text-[10px] font-medium text-text-3">Evolución</p>
        <EvolutionSparkline series={series} />
      </div>
    </div>
  )
}

export function TiktokPerformanceSection({ videos, tiktokUsername }: { videos: TiktokVideoRow[]; tiktokUsername: string | null }) {
  const [syncing, startSync] = useTransition()
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeMode>('30d')
  const [sortMode, setSortMode] = useState<SortMode>('views')
  const [page, setPage] = useState(1)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [escalatingId, setEscalatingId] = useState<string | null>(null)
  const [escalateResults, setEscalateResults] = useState<Record<string, { ok: boolean; message: string }>>({})
  const [comparing, setComparing] = useState(false)
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())
  const [showComparison, setShowComparison] = useState(false)

  const filtered = useMemo(() => filterByDateRange(videos, dateRange, (v) => v.posted_at), [videos, dateRange])
  const periodLabel = DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label.toLowerCase() ?? 'período elegido'
  const overviewKpis = useMemo(() => computeTiktokOverviewKpis(filtered), [filtered])

  const winners = useMemo(() => detectTiktokWinners(filtered), [filtered])
  const sorted = useMemo(() => sortVideos(filtered, sortMode), [filtered, sortMode])
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const maxViews = useMemo(() => Math.max(1, ...videos.map((v) => v.view_count)), [videos])
  const maxLikes = useMemo(() => Math.max(1, ...videos.map((v) => v.like_count)), [videos])
  const maxComments = useMemo(() => Math.max(1, ...videos.map((v) => v.comment_count)), [videos])
  const maxShares = useMemo(() => Math.max(1, ...videos.map((v) => v.share_count)), [videos])

  const selectedVideo = videos.find((v) => v.id === selectedVideoId) ?? null
  const compareVideos = videos.filter((v) => compareIds.has(v.id))

  function handleSortChange(mode: SortMode) {
    setSortMode(mode)
    setPage(1)
  }

  function toggleComparing() {
    setComparing((v) => !v)
    setCompareIds(new Set())
  }

  function toggleCompareSelected(id: string) {
    setCompareIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_COMPARE) next.add(id)
      return next
    })
  }

  function handleCardClick(id: string) {
    if (comparing) toggleCompareSelected(id)
    else setSelectedVideoId(id)
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {tiktokUsername && <p className="text-xs font-medium text-text-2">@{tiktokUsername}</p>}
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            title="Sincronizar TikTok ahora"
            className="flex items-center gap-1 rounded-control px-1.5 py-0.5 text-text-3 transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={syncing ? 'animate-spin' : ''}
            >
              <path d="M15.5 9a6.5 6.5 0 1 1-1.9-4.6" />
              <path d="M15.5 2.5v4h-4" />
            </svg>
            <span className="text-[10px] font-semibold">{syncing ? 'Sincronizando…' : 'Sincronizar'}</span>
          </button>
          {syncError && <span className="text-[10px] text-red">{syncError}</span>}
          {syncMessage && <span className="text-[10px] text-green">{syncMessage}</span>}
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <TiktokOverviewKpis kpis={overviewKpis} periodLabel={periodLabel} />

      <TiktokDayOfWeekChart videos={filtered} />

      <div className="rounded-card border border-border bg-surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <TiktokIcon size={17} />
          <h2 className="text-sm font-semibold tracking-tight text-text">Catálogo y Evolución de Videos</h2>
        </div>

        {videos.length === 0 ? (
          <p className="text-xs text-text-3">Todavía no sincronizaste tu historial de TikTok — tocá &ldquo;Sincronizar&rdquo; arriba, al lado de tu usuario.</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-text-3">Ningún video en el rango de fechas seleccionado arriba.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <div className="flex gap-1 rounded-control border border-border bg-surface-2/40 p-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSortChange(opt.value)}
                      className={`flex items-center gap-1 rounded-control px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200 ease-out ${
                        sortMode === opt.value ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
                      }`}
                    >
                      <opt.Icon />
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={toggleComparing}
                  className={`flex items-center gap-1 rounded-control border px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-200 ease-out ${
                    comparing ? 'border-accent/30 bg-accent/[0.12] text-accent' : 'border-border bg-surface-2/40 text-text-2 hover:text-text'
                  }`}
                >
                  <CompareIcon />
                  {comparing ? 'Cancelar' : 'Comparar'}
                </button>
              </div>
              <p className="text-[10px] text-text-3">{sorted.length} videos</p>
            </div>

            {comparing && (
              <div className="mb-4 flex items-center justify-between rounded-control border border-accent/30 bg-accent/[0.03] px-3 py-2">
                <p className="text-[11px] font-medium text-text-2">
                  {compareIds.size === 0
                    ? `Elegí entre 2 y ${MAX_COMPARE} videos para comparar frente a frente.`
                    : `${compareIds.size}/${MAX_COMPARE} seleccionados`}
                </p>
                {compareIds.size >= 2 && (
                  <button
                    type="button"
                    onClick={() => setShowComparison(true)}
                    className="rounded-control bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
                  >
                    Comparar ({compareIds.size})
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_180px]">
              <div>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
                  {pageItems.map((v) => {
                    const isWinner = winners.has(v.id)
                    const isSelected = compareIds.has(v.id)
                    const duration = formatDuration(v.duration_seconds)
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleCardClick(v.id)}
                        className={`group flex flex-col overflow-hidden rounded-control border bg-surface-2/40 text-left transition-all duration-200 ease-out ${
                          isSelected ? 'border-accent' : 'border-border hover:border-text-3 hover:shadow-sm'
                        }`}
                      >
                        <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-black">
                          {v.cover_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- thumbnail remoto de TikTok, no un asset local.
                            <img
                              src={v.cover_image_url}
                              alt=""
                              className="h-full w-full object-cover object-center transition-transform duration-200 ease-out group-hover:scale-[1.04]"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-text-3">
                              <TiktokIcon size={16} />
                            </div>
                          )}

                          {comparing ? (
                            <span
                              className={`absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border shadow ${
                                isSelected ? 'border-accent bg-accent text-white' : 'border-white/70 bg-black/40 text-transparent'
                              }`}
                            >
                              <CheckIcon />
                            </span>
                          ) : (
                            isWinner && (
                              <span
                                title="Video viral"
                                className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white shadow"
                              >
                                <StarIcon />
                              </span>
                            )
                          )}
                          {duration && (
                            <span className="absolute right-1 top-1 rounded-full bg-black/45 px-1.5 py-0.5 text-[8px] font-bold tabular-nums text-white backdrop-blur-[1px]">
                              {duration}
                            </span>
                          )}

                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 via-black/20 to-transparent px-1.5 pb-1 pt-4 text-white">
                            <span className="flex items-center gap-0.5 text-[9px] font-semibold tabular-nums">
                              <EyeIcon size={9} />
                              {fmtCompactCount(v.view_count)}
                            </span>
                            <span className="flex items-center gap-0.5 text-[9px] font-semibold tabular-nums">
                              <HeartIcon size={9} />
                              {fmtCompactCount(interactionsTotal(v))}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
                          <p className="line-clamp-1 text-[10px] leading-snug text-text-3">
                            {v.description ? truncateWords(v.description, 10) : 'Sin descripción'}
                          </p>
                          {v.posted_at && (
                            <p className="flex items-center gap-1 text-[9px] text-text-3/70">
                              <CalendarIcon size={9} />
                              {formatPostedDate(v.posted_at)}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
              </div>

              <TiktokSummaryCard videos={filtered} />
            </div>
          </>
        )}
      </div>

      {selectedVideo && (
        <TiktokVideoDetailModal
          video={selectedVideo}
          maxViews={maxViews}
          maxLikes={maxLikes}
          maxComments={maxComments}
          maxShares={maxShares}
          escalating={escalatingId === selectedVideo.id}
          escalateResult={escalateResults[selectedVideo.id] ?? null}
          onClose={() => setSelectedVideoId(null)}
          onEscalate={() => handleEscalate(selectedVideo.id)}
        />
      )}

      {showComparison && compareVideos.length >= 2 && (
        <TiktokComparisonPanel
          videos={compareVideos}
          onClose={() => {
            setShowComparison(false)
            toggleComparing()
          }}
        />
      )}
    </div>
  )
}
