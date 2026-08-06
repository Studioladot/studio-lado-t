'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MetaCampaignAd } from '@/lib/meta/campaigns'
import { bulkToggleAdStatusAction, toggleAdStatusAction } from '../actions'
import { STATUS_LABEL, STATUS_COLOR, TOGGLEABLE, matchesStatusFilter } from '../status'
import { buildMetricColumns, METRIC_LABELS, METRIC_CELL_CLASS, DEFAULT_COLUMN_IDS, COLUMNS_STORAGE_KEY, type MetricColumnId } from '../metric-defs'
import { SortableTh, type SortDirection } from '../sortable-th'
import { ColumnsPopover } from '../columns-popover'
import { Pagination } from '../pagination'
import { Switch } from '../switch'
import { StrategicStatusDot } from '../strategic-status-dot'
import type { CampaignTargets } from '@/lib/meta/autopilot'
import { useCurrency } from '@/lib/context/currency-context'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { EntityStatusFilter } from './entity-status-filter'

const PAGE_SIZE = 10
const HIGH_SPEND_CONFIRM_USD = 30

type AdSortKey = 'adSetName' | 'status' | 'createdAt' | MetricColumnId

// Mismo patrón que CampaignStatusToggle/AdSetStatusToggle, apuntando a
// toggleAdStatusAction.
function AdStatusToggle({
  adId,
  adName,
  effectiveStatus,
  spend,
  returnTo,
}: {
  adId: string
  adName: string
  effectiveStatus: string
  spend: number
  returnTo: string
}) {
  const isActive = effectiveStatus === 'ACTIVE'
  const requiresConfirm = isActive && spend >= HIGH_SPEND_CONFIRM_USD

  return (
    <form action={toggleAdStatusAction} className="inline-flex items-center" onClick={(event) => event.stopPropagation()}>
      <input type="hidden" name="ad_id" value={adId} />
      <input type="hidden" name="next_status" value={isActive ? 'PAUSED' : 'ACTIVE'} />
      <input type="hidden" name="return_to" value={returnTo} />
      <Switch
        type="submit"
        on={isActive}
        ariaLabel={isActive ? `Pausar ${adName}` : `Activar ${adName}`}
        onClick={(event) => {
          if (requiresConfirm) {
            const confirmed = window.confirm(
              `"${adName}" acumula $${spend.toFixed(0)} de gasto en el período seleccionado. ¿Confirmás pausarlo?`
            )
            if (!confirmed) event.preventDefault()
          }
        }}
      />
    </form>
  )
}

export function AdsWorkspace({
  ads,
  campaignId,
  returnTo,
  targets,
}: {
  ads: MetaCampaignAd[]
  campaignId: string
  returnTo: string
  targets: CampaignTargets
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeColumns, setActiveColumns] = useState<MetricColumnId[]>(DEFAULT_COLUMN_IDS)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [page, setPage] = useState(1)

  // Mismo storage key que Campañas/Conjuntos — una sola preferencia de
  // columnas compartida entre los 3 niveles.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COLUMNS_STORAGE_KEY) ?? 'null')
      if (Array.isArray(saved) && saved.length) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveColumns(saved.filter((id) => METRIC_LABELS.some((m) => m.id === id)))
      }
    } catch {
      // localStorage corrupto o inaccesible — se queda con el default.
    }
  }, [])

  function updateColumns(next: MetricColumnId[]) {
    setActiveColumns(next)
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(next))
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = ads.filter(
    (a) => a.name.toLowerCase().includes(query.trim().toLowerCase()) && matchesStatusFilter(a.effectiveStatus, status)
  )
  const { displayCurrency, accountCurrency, usdArsRate } = useCurrency()
  const metricColumns = useMemo(
    () => buildMetricColumns({ displayCurrency, accountCurrency, usdArsRate }),
    [displayCurrency, accountCurrency, usdArsRate]
  )
  const visibleColumns = metricColumns.filter((m) => activeColumns.includes(m.id))

  const [sortKey, setSortKey] = useState<AdSortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  function handleSort(key: AdSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function getSortValue(ad: MetaCampaignAd, key: AdSortKey): number | string {
    if (key === 'adSetName') return ad.adSetName
    if (key === 'status') return ad.effectiveStatus
    if (key === 'createdAt') return ad.createdAt ? new Date(ad.createdAt).getTime() : 0
    return metricColumns.find((c) => c.id === key)?.value(ad) ?? 0
  }

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortKey)
      const bv = getSortValue(b, sortKey)
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortKey, sortDir, metricColumns])

  const selectedCount = selectedIds.size
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[.08em] text-text-3">Anuncios (30 días)</p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setColumnsOpen((v) => !v)}
            aria-expanded={columnsOpen}
            className="flex h-[34px] items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-xs font-semibold text-text-2 outline-none transition-all duration-200 ease-out hover:bg-surface-2 hover:text-text focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0 opacity-70">
              <rect x="1" y="1" width="14" height="14" rx="2" />
              <path d="M6 1v14M11 1v14" />
            </svg>
            Columnas
            <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-text-3">{activeColumns.length}</span>
          </button>
          {columnsOpen && (
            <ColumnsPopover activeColumns={activeColumns} onChange={updateColumns} onClose={() => setColumnsOpen(false)} />
          )}
        </div>
      </div>

      <EntityStatusFilter
        query={query}
        status={status}
        onQueryChange={(v) => {
          setQuery(v)
          setPage(1)
        }}
        onStatusChange={(v) => {
          setStatus(v)
          setPage(1)
        }}
        searchPlaceholder="Buscar por nombre de anuncio…"
      />

      {filtered.length === 0 ? (
        <div className="rounded-card border border-border bg-surface px-6 py-8 text-center text-sm text-text-2">
          Ningún anuncio coincide con el filtro.
        </div>
      ) : (
        <>
          {selectedCount > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-control border border-accent/30 bg-accent/[0.06] px-4 py-2.5">
              <span className="text-xs font-semibold text-text">
                {selectedCount} anuncio{selectedCount === 1 ? '' : 's'} seleccionado{selectedCount === 1 ? '' : 's'}
              </span>
              <form action={bulkToggleAdStatusAction} className="flex items-center gap-3">
                <input type="hidden" name="ad_ids" value={[...selectedIds].join(',')} />
                <input type="hidden" name="next_status" value="PAUSED" />
                <input type="hidden" name="return_to" value={returnTo} />
                <ConfirmSubmitButton
                  confirmMessage={`¿Pausar ${selectedCount} anuncio(s) seleccionado(s)?`}
                  className="text-xs font-semibold text-text-2 transition-colors duration-200 ease-out hover:text-text"
                >
                  Pausar seleccionados
                </ConfirmSubmitButton>
              </form>
              <form action={bulkToggleAdStatusAction} className="flex items-center gap-3">
                <input type="hidden" name="ad_ids" value={[...selectedIds].join(',')} />
                <input type="hidden" name="next_status" value="ACTIVE" />
                <input type="hidden" name="return_to" value={returnTo} />
                <ConfirmSubmitButton
                  confirmMessage={`¿Reactivar ${selectedCount} anuncio(s) seleccionado(s)? Esto puede generar gasto real.`}
                  className="text-xs font-semibold text-text-2 transition-colors duration-200 ease-out hover:text-text"
                >
                  Reactivar seleccionados
                </ConfirmSubmitButton>
              </form>
              {selectedCount >= 2 && (
                <button
                  type="button"
                  onClick={() => router.push(`/meta-ads/campaigns/${campaignId}/compare?ads=${[...selectedIds].join(',')}`)}
                  className="rounded-control bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_12px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
                >
                  Comparar anuncios
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-text"
              >
                Limpiar selección
              </button>
            </div>
          )}

          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="divide-x divide-divider border-b border-divider text-left text-[10px] font-bold uppercase tracking-wide text-text-3">
                  <th className="sticky left-0 z-10 w-10 border-r border-border bg-surface px-4 py-1.5" />
                  <th className="sticky left-10 z-10 w-[260px] min-w-[260px] max-w-[260px] border-r border-border bg-surface px-4 py-1.5">
                    Anuncio
                  </th>
                  <SortableTh label="Conjunto" sortKey="adSetName" activeKey={sortKey} direction={sortDir} onSort={handleSort} align="left" />
                  <SortableTh label="Estado" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableTh label="Fecha de Creación" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  {visibleColumns.map((column) => (
                    <SortableTh key={column.id} label={column.label} sortKey={column.id} activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((ad) => (
                  <tr key={ad.id} className="divide-x divide-divider border-b border-divider last:border-0">
                    <td
                      className={`sticky left-0 z-10 w-10 border-r border-border bg-surface px-4 py-1.5 ${
                        ad.effectiveStatus === 'ACTIVE' ? 'border-l-[3px] border-l-green' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(ad.id)}
                        onChange={() => toggleSelected(ad.id)}
                        className="accent-accent"
                        aria-label={`Seleccionar ${ad.name}`}
                      />
                    </td>
                    <td className="sticky left-10 z-10 w-[260px] min-w-[260px] max-w-[260px] border-r border-border bg-surface px-4 py-1.5">
                      <div className="flex items-center gap-2">
                        {ad.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ad.thumbnailUrl}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-surface-2 text-[9px] text-text-3">
                            —
                          </div>
                        )}
                        <div className="truncate font-medium text-text" title={ad.name}>
                          {ad.name}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-1.5 text-text-2">{ad.adSetName}</td>
                    <td className="px-5 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <StrategicStatusDot metrics={ad} targets={targets} />
                        {TOGGLEABLE.has(ad.effectiveStatus) ? (
                          <AdStatusToggle
                            adId={ad.id}
                            adName={ad.name}
                            effectiveStatus={ad.effectiveStatus}
                            spend={ad.spend}
                            returnTo={returnTo}
                          />
                        ) : (
                          <span
                            className={`whitespace-nowrap rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                              STATUS_COLOR[ad.effectiveStatus] ?? 'text-text-2'
                            }`}
                          >
                            {STATUS_LABEL[ad.effectiveStatus] ?? ad.effectiveStatus}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-1.5 text-center text-sm text-text-2">
                      {ad.createdAt ? new Date(ad.createdAt).toLocaleDateString('es-AR') : '—'}
                    </td>
                    {visibleColumns.map((column) => (
                      <td key={column.id} className={METRIC_CELL_CLASS[column.tier]}>
                        {column.render(ad, targets)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={currentPage} totalPages={pageCount} onChange={setPage} />
        </>
      )}
    </div>
  )
}
