'use client'

import { useId, useMemo, useState } from 'react'
import { InstagramMediaDetailModal } from './instagram-media-detail-modal'
import { ComparisonPanel } from './comparison-panel'
import { Pagination } from '../meta-ads/campaigns/pagination'
import { detectInstagramCatalogWinners, primaryMetric, interactionsTotal, type InstagramCatalogRow } from '@/lib/instagram/media-catalog-winners'
import { InstagramIcon } from '@/components/features/nav-icons'
import { fmtCompactCount } from '@/lib/format/number'

// Set de íconos chico y local a esta sección (no nav-icons.tsx — ese
// archivo es para el sidebar, ver su propio comentario de cabecera) pero
// deliberadamente REUSADO entre pills de filtro/orden y overlay de cada
// tarjeta (Reel/Carrusel/ojo/corazón aparecen en los dos lugares) — mismo
// ícono para el mismo concepto en toda la sección, la consistencia que
// separa un panel prolijo de uno amateur.
type IconProps = { size?: number }

function EyeIcon({ size = 11 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 9S4.5 4 9 4s7.5 5 7.5 5-3 5-7.5 5-7.5-5-7.5-5Z" />
      <circle cx="9" cy="9" r="2" />
    </svg>
  )
}

function HeartIcon({ size = 11 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 15.5S2.25 11.1 2.25 6.6A3.35 3.35 0 0 1 9 5.3a3.35 3.35 0 0 1 6.75 1.3C15.75 11.1 9 15.5 9 15.5Z" />
    </svg>
  )
}

function CalendarIcon({ size = 10 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.25" y="3.5" width="13.5" height="12" rx="1.75" />
      <path d="M2.25 7.25h13.5M6 2v3M12 2v3" />
    </svg>
  )
}

function ReelIcon({ size = 11 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="14" height="14" rx="3.5" />
      <path d="M7.25 6.5l4.25 2.5-4.25 2.5V6.5Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function CarouselIcon({ size = 11 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="2.5" width="11" height="11" rx="2" />
      <rect x="2.5" y="4.5" width="11" height="11" rx="2" />
    </svg>
  )
}

function LeafIcon({ size = 11 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 2.5c-7.2 0-11.5 4.8-11.5 11.5 7.2 0 11.5-4.8 11.5-11.5Z" />
      <path d="M4.5 14 10 8.5" />
    </svg>
  )
}

function GridIcon({ size = 11 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="2" width="6" height="6" rx="1.25" />
      <rect x="10" y="2" width="6" height="6" rx="1.25" />
      <rect x="2" y="10" width="6" height="6" rx="1.25" />
      <rect x="10" y="10" width="6" height="6" rx="1.25" />
    </svg>
  )
}

function StarIcon({ size = 11 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="currentColor" stroke="none">
      <path d="M9 1.5l2.27 4.86 5.23.72-3.8 3.77.9 5.4L9 13.7l-4.6 2.55.9-5.4-3.8-3.77 5.23-.72L9 1.5Z" />
    </svg>
  )
}

function ClockIcon({ size = 11 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="7" />
      <path d="M9 5.5v4l2.75 1.75" />
    </svg>
  )
}

function CommentIcon({ size = 11 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4.25h12a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H8.25L4.5 15.5v-2.75H3a1 1 0 0 1-1-1v-6.5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

function CompareIcon({ size = 11 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="6" height="12" rx="1.5" />
      <rect x="10" y="3" width="6" height="12" rx="1.5" />
    </svg>
  )
}

function CheckIcon({ size = 9 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5l3.2 3.2L14.5 5.5" />
    </svg>
  )
}

type SortMode = 'primary' | 'recent' | 'likes' | 'comments'

const SORT_OPTIONS: { value: SortMode; label: string; Icon: (props: IconProps) => React.JSX.Element }[] = [
  { value: 'primary', label: 'Más vistas', Icon: EyeIcon },
  { value: 'recent', label: 'Más recientes', Icon: ClockIcon },
  { value: 'likes', label: 'Más likes', Icon: HeartIcon },
  { value: 'comments', label: 'Más comentarios', Icon: CommentIcon },
]

type FilterMode = 'all' | 'reels' | 'carousel' | 'organic'

const FILTER_OPTIONS: { value: FilterMode; label: string; Icon: (props: IconProps) => React.JSX.Element }[] = [
  { value: 'all', label: 'Todos', Icon: GridIcon },
  { value: 'reels', label: 'Reels', Icon: ReelIcon },
  { value: 'carousel', label: 'Carruseles', Icon: CarouselIcon },
  { value: 'organic', label: 'Orgánico', Icon: LeafIcon },
]

const PAGE_SIZE = 24
// "Comparación Premium" (2026-08-06, resurrección de comparison-panel.tsx
// adaptado a InstagramCatalogRow) — mismo límite que la vieja tabla de
// Rendimiento: más de 4 columnas frente a frente no entra sin scroll
// horizontal ilegible.
const MAX_COMPARE = 4

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

// "Orgánico" = no publicado desde el pipeline de Gotix (gotixMediaIds) —
// mismo criterio de "¿esto nació acá?" que ya usaba el badge "Publicado con
// Gotix" (2026-08-06: se sacó de la tarjeta por densidad visual, el criterio
// sigue vivo acá y en el modal de detalle).
function filterItems(items: InstagramCatalogRow[], mode: FilterMode, gotixMediaIds: Set<string>): InstagramCatalogRow[] {
  switch (mode) {
    case 'reels':
      return items.filter((i) => i.media_product_type === 'REELS')
    case 'carousel':
      return items.filter((i) => i.media_type === 'CAROUSEL_ALBUM')
    case 'organic':
      return items.filter((i) => !(i.ig_media_id && gotixMediaIds.has(i.ig_media_id)))
    case 'all':
    default:
      return items
  }
}

/** Ícono de formato — solo Reel/Carrusel se marcan (pedido explícito): una publicación de feed normal no necesita badge. */
function FormatBadge({ item }: { item: InstagramCatalogRow }) {
  if (item.media_product_type === 'REELS') {
    return (
      <span
        title="Reel"
        className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-[1px]"
      >
        <ReelIcon size={9} />
      </span>
    )
  }
  if (item.media_type === 'CAROUSEL_ALBUM') {
    return (
      <span
        title="Carrusel"
        className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-[1px]"
      >
        <CarouselIcon size={9} />
      </span>
    )
  }
  return null
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= maxWords) return text.trim()
  return `${words.slice(0, maxWords).join(' ')}…`
}

function formatPostedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

// Mismo orden de fallback que primaryMetric (plays ?? reach ?? impressions)
// — reusa null (no 0) para que sumOrNull no cuente un ítem sin ningún dato
// como si valiera cero.
function viewsOf(item: InstagramCatalogRow): number | null {
  return item.plays ?? item.reach ?? item.impressions ?? null
}

function sumOrNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null)
  if (present.length === 0) return null
  return present.reduce((a, b) => a + b, 0)
}

// Mini gráfico de evolución — puerto reducido del mismo trazo que
// operations/sales/sparkline.tsx (línea + área con gradiente), pero SIN
// posicionamiento absoluto (ese vive suelto dentro de una metric-card; acá
// necesita ocupar su propio bloque en la tarjeta de resumen).
function EvolutionSparkline({ series }: { series: number[] }) {
  const gradientId = `catalog-spark-${useId()}`
  const width = 148
  const height = 34
  if (series.length < 2) {
    return <p className="text-[10px] text-text-3">Necesitamos al menos 2 publicaciones con fecha para graficar la evolución.</p>
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

/** Tarjeta de resumen agregado del conjunto filtrado — vistas totales, promedio y su evolución cronológica. */
function CatalogSummaryCard({ items }: { items: InstagramCatalogRow[] }) {
  const totalViews = sumOrNull(items.map(viewsOf))
  const withViews = items.filter((i) => viewsOf(i) !== null).length
  const avgViews = totalViews !== null && withViews > 0 ? totalViews / withViews : null

  const series = [...items]
    .filter((i) => i.posted_at)
    .sort((a, b) => (a.posted_at ?? '').localeCompare(b.posted_at ?? ''))
    .slice(-20)
    .map((i) => viewsOf(i) ?? 0)

  return (
    <div className="flex h-fit flex-col gap-4 rounded-control border border-border bg-surface-2/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Resumen del conjunto</p>
      <div>
        <p className="text-[10px] font-medium text-text-3">Vistas totales</p>
        <p className="mt-0.5 text-xl font-extrabold tabular-nums text-text">{fmtCompactCount(totalViews)}</p>
      </div>
      <div>
        <p className="text-[10px] font-medium text-text-3">Promedio por publicación</p>
        <p className="mt-0.5 text-base font-bold tabular-nums text-text">{fmtCompactCount(avgViews)}</p>
      </div>
      <div>
        <p className="mb-1.5 text-[10px] font-medium text-text-3">Evolución</p>
        <EvolutionSparkline series={series} />
      </div>
    </div>
  )
}

type DateRangeMode = '7d' | '30d' | '90d' | 'all'

const DATE_RANGE_OPTIONS: { value: DateRangeMode; label: string }[] = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: 'all', label: 'Todo el historial' },
]

/**
 * Selector de rango de fechas — preparado 2026-08-06 para un filtrado real
 * de la data global, todavía sin conectar: hoy es solo estado local
 * (dateRange nunca se usa para filtrar `items`). Cuando el fetch de
 * content/page.tsx acepte un rango como parámetro, este componente pasa a
 * levantar el estado al padre en vez de guardarlo acá.
 */
function DateRangePicker({ value, onChange }: { value: DateRangeMode; onChange: (mode: DateRangeMode) => void }) {
  const [open, setOpen] = useState(false)
  const current = DATE_RANGE_OPTIONS.find((o) => o.value === value) ?? DATE_RANGE_OPTIONS[1]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-control border border-border bg-surface-2/40 px-2.5 py-1.5 text-[11px] font-semibold text-text-2 transition-colors duration-200 ease-out hover:text-text"
      >
        <CalendarIcon size={11} />
        {current.label}
        <svg
          width="8"
          height="8"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition-transform duration-200 ease-out ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2.5 3.5 5 6l2.5-2.5" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-[calc(100%+4px)] z-20 flex w-40 flex-col gap-0.5 rounded-control border border-border bg-surface p-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)]">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`rounded-control px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors duration-200 ease-out ${
                  opt.value === value ? 'bg-accent/[0.12] text-accent' : 'text-text-2 hover:bg-surface-2 hover:text-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Catálogo "zero fricción" del feed histórico de Instagram (Panel de
// Inteligencia de Contenido, 2026-08-01) — rediseño 2026-08-06 al estilo de
// benchmarks premium de BI (Moka): tarjetas cuadradas uniformes, overlay de
// métricas con íconos en vez de texto ruidoso, resumen agregado al costado.
// Sin botón de "Escalar": el contenido ya está en Instagram, no tiene
// destino al que cross-postear todavía. Sin botón de sync propio (sacado
// 2026-08-06): el único control de sincronización de toda la sección vive
// en InstagramSyncControl, arriba de todo — dos botones de "Sincronizar"
// en la misma pantalla leía como un descuido, no como dos funciones
// distintas.
export function InstagramMediaCatalogSection({
  items,
  gotixMediaIds,
}: {
  items: InstagramCatalogRow[]
  gotixMediaIds: Set<string>
}) {
  const [sortMode, setSortMode] = useState<SortMode>('primary')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [dateRange, setDateRange] = useState<DateRangeMode>('30d')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [comparing, setComparing] = useState(false)
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())
  const [showComparison, setShowComparison] = useState(false)

  const winners = useMemo(() => detectInstagramCatalogWinners(items), [items])
  const filtered = useMemo(() => filterItems(items, filterMode, gotixMediaIds), [items, filterMode, gotixMediaIds])
  const sorted = useMemo(() => sortItems(filtered, sortMode), [filtered, sortMode])
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const maxPrimary = useMemo(() => Math.max(1, ...items.map(primaryMetric)), [items])
  const maxLikes = useMemo(() => Math.max(1, ...items.map((i) => i.like_count ?? 0)), [items])
  const maxComments = useMemo(() => Math.max(1, ...items.map((i) => i.comments_count ?? 0)), [items])

  const selectedItem = items.find((i) => i.id === selectedId) ?? null
  const compareItems = items.filter((i) => compareIds.has(i.id))

  function handleSortChange(mode: SortMode) {
    setSortMode(mode)
    setPage(1)
  }

  function handleFilterChange(mode: FilterMode) {
    setFilterMode(mode)
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
    else setSelectedId(id)
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <InstagramIcon size={17} gradient />
        <h2 className="text-sm font-semibold tracking-tight text-text">Catálogo y Evolución de Publicaciones</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-text-3">
          Todavía no sincronizaste tu historial de Instagram — tocá &ldquo;Sincronizar&rdquo; arriba, al lado de tu usuario. Cuentas grandes pueden
          necesitar varios clics (cada uno trae un lote).
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <div className="flex gap-1 rounded-control border border-border bg-surface-2/40 p-1">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleFilterChange(opt.value)}
                    className={`flex items-center gap-1 rounded-control px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200 ease-out ${
                      filterMode === opt.value ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
                    }`}
                  >
                    <opt.Icon />
                    {opt.label}
                  </button>
                ))}
              </div>
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
              <DateRangePicker value={dateRange} onChange={setDateRange} />
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
            <p className="text-[10px] text-text-3">{sorted.length} publicaciones</p>
          </div>

          {comparing && (
            <div className="mb-4 flex items-center justify-between rounded-control border border-accent/30 bg-accent/[0.03] px-3 py-2">
              <p className="text-[11px] font-medium text-text-2">
                {compareIds.size === 0
                  ? `Elegí entre 2 y ${MAX_COMPARE} publicaciones para comparar frente a frente.`
                  : `${compareIds.size}/${MAX_COMPARE} seleccionadas`}
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

          {sorted.length === 0 ? (
            <p className="text-xs text-text-3">Ninguna publicación coincide con este filtro.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_180px]">
              <div>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
                  {pageItems.map((item) => {
                    const isWinner = winners.has(item.id)
                    const views = primaryMetric(item)
                    const interactions = interactionsTotal(item)
                    const isSelected = compareIds.has(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleCardClick(item.id)}
                        className={`group flex flex-col overflow-hidden rounded-control border bg-surface-2/40 text-left transition-all duration-200 ease-out ${
                          isSelected ? 'border-accent' : 'border-border hover:border-text-3 hover:shadow-sm'
                        }`}
                      >
                        <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-black">
                          {item.thumbnail_url || item.media_url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- thumbnail remoto de Instagram, no un asset local.
                            <img
                              src={item.thumbnail_url ?? item.media_url ?? undefined}
                              alt=""
                              className="h-full w-full object-cover object-center transition-transform duration-200 ease-out group-hover:scale-[1.04]"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-text-3">
                              <InstagramIcon size={16} />
                            </div>
                          )}

                          {comparing ? (
                            <span
                              className={`absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border shadow ${
                                isSelected ? 'border-accent bg-accent text-white' : 'border-white/70 bg-black/40 text-transparent'
                              }`}
                            >
                              <CheckIcon size={8} />
                            </span>
                          ) : (
                            isWinner && (
                              <span
                                title="Publicación viral"
                                className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white shadow"
                              >
                                <StarIcon size={8} />
                              </span>
                            )
                          )}
                          <FormatBadge item={item} />

                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 via-black/20 to-transparent px-1.5 pb-1 pt-4 text-white">
                            <span className="flex items-center gap-0.5 text-[9px] font-semibold tabular-nums">
                              <EyeIcon size={9} />
                              {fmtCompactCount(views)}
                            </span>
                            <span className="flex items-center gap-0.5 text-[9px] font-semibold tabular-nums">
                              <HeartIcon size={9} />
                              {fmtCompactCount(interactions)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
                          <p className="line-clamp-1 text-[10px] leading-snug text-text-3">
                            {item.caption ? truncateWords(item.caption, 10) : 'Sin descripción'}
                          </p>
                          {item.posted_at && (
                            <p className="flex items-center gap-1 text-[9px] text-text-3/70">
                              <CalendarIcon size={9} />
                              {formatPostedDate(item.posted_at)}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
              </div>

              <CatalogSummaryCard items={filtered} />
            </div>
          )}
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

      {showComparison && compareItems.length >= 2 && (
        <ComparisonPanel
          items={compareItems}
          onClose={() => {
            setShowComparison(false)
            toggleComparing()
          }}
        />
      )}
    </div>
  )
}
