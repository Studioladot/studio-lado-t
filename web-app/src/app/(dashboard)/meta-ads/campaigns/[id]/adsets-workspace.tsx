'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MetaAdSet } from '@/lib/meta/campaigns'
import { bulkToggleAdSetStatusAction, toggleAdSetStatusAction } from '../actions'
import { STATUS_LABEL, STATUS_COLOR, TOGGLEABLE, matchesStatusFilter, formatBudget } from '../status'
import { buildMetricColumns, METRIC_LABELS, DEFAULT_COLUMN_IDS, COLUMNS_STORAGE_KEY, type MetricColumnId } from '../metric-defs'
import { SortableTh, type SortDirection } from '../sortable-th'
import { ColumnsPopover } from '../columns-popover'
import { Pagination } from '../pagination'
import { Switch } from '../switch'
import { StrategicStatusDot } from '../strategic-status-dot'
import type { CampaignTargets } from '@/lib/meta/autopilot'
import { useCurrency } from '@/lib/context/currency-context'
import { convertAmount } from '@/lib/currency'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { EntityStatusFilter } from './entity-status-filter'

const PAGE_SIZE = 10
const HIGH_SPEND_CONFIRM_USD = 30

type AdSetSortKey = 'status' | 'budget' | 'createdAt' | MetricColumnId

// Mismo patrón que CampaignStatusToggle (../campaign-status-toggle.tsx),
// apuntando a toggleAdSetStatusAction — chico y de un solo uso, no vale la
// pena forzarlo genérico entre campaña/conjunto/anuncio.
function AdSetStatusToggle({
  adSetId,
  adSetName,
  effectiveStatus,
  spend,
  returnTo,
}: {
  adSetId: string
  adSetName: string
  effectiveStatus: string
  spend: number
  returnTo: string
}) {
  const isActive = effectiveStatus === 'ACTIVE'
  const requiresConfirm = isActive && spend >= HIGH_SPEND_CONFIRM_USD

  return (
    <form action={toggleAdSetStatusAction} className="inline-flex items-center" onClick={(event) => event.stopPropagation()}>
      <input type="hidden" name="adset_id" value={adSetId} />
      <input type="hidden" name="next_status" value={isActive ? 'PAUSED' : 'ACTIVE'} />
      <input type="hidden" name="return_to" value={returnTo} />
      <Switch
        type="submit"
        on={isActive}
        ariaLabel={isActive ? `Pausar ${adSetName}` : `Activar ${adSetName}`}
        onClick={(event) => {
          if (requiresConfirm) {
            const confirmed = window.confirm(
              `"${adSetName}" acumula $${spend.toFixed(0)} de gasto en el período seleccionado. ¿Confirmás pausarlo?`
            )
            if (!confirmed) event.preventDefault()
          }
        }}
      />
    </form>
  )
}

export function AdSetsWorkspace({
  adSets,
  campaignId,
  returnTo,
  targets,
}: {
  adSets: MetaAdSet[]
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

  // Mismo storage key que Campañas (COLUMNS_STORAGE_KEY, metric-defs.tsx) — la
  // preferencia de columnas es una sola, compartida entre los 3 niveles, igual
  // que el metaActiveColumns único del legado.
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

  const filtered = adSets.filter(
    (a) => a.name.toLowerCase().includes(query.trim().toLowerCase()) && matchesStatusFilter(a.effectiveStatus, status)
  )
  const { displayCurrency, accountCurrency, usdArsRate } = useCurrency()
  const metricColumns = useMemo(
    () => buildMetricColumns({ displayCurrency, accountCurrency, usdArsRate }),
    [displayCurrency, accountCurrency, usdArsRate]
  )
  const visibleColumns = metricColumns.filter((m) => activeColumns.includes(m.id))

  const [sortKey, setSortKey] = useState<AdSetSortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  function handleSort(key: AdSetSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function getSortValue(adSet: MetaAdSet, key: AdSetSortKey): number | string {
    if (key === 'status') return adSet.effectiveStatus
    if (key === 'budget') return adSet.dailyBudget ?? adSet.lifetimeBudget ?? 0
    if (key === 'createdAt') return adSet.createdAt ? new Date(adSet.createdAt).getTime() : 0
    return metricColumns.find((c) => c.id === key)?.value(adSet) ?? 0
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
        <p className="text-[11px] font-bold uppercase tracking-[.08em] text-text-3">Conjuntos de anuncios (30 días)</p>
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
        searchPlaceholder="Buscar por nombre de conjunto…"
      />

      {filtered.length === 0 ? (
        <div className="rounded-card border border-border bg-surface px-6 py-8 text-center text-sm text-text-2">
          Ningún conjunto coincide con el filtro.
        </div>
      ) : (
        <>
          {selectedCount > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-control border border-accent/30 bg-accent/[0.06] px-4 py-2.5">
              <span className="text-xs font-semibold text-text">
                {selectedCount} conjunto{selectedCount === 1 ? '' : 's'} seleccionado{selectedCount === 1 ? '' : 's'}
              </span>
              <form action={bulkToggleAdSetStatusAction} className="flex items-center gap-3">
                <input type="hidden" name="adset_ids" value={[...selectedIds].join(',')} />
                <input type="hidden" name="next_status" value="PAUSED" />
                <input type="hidden" name="return_to" value={returnTo} />
                <ConfirmSubmitButton
                  confirmMessage={`¿Pausar ${selectedCount} conjunto(s) seleccionado(s)?`}
                  className="text-xs font-semibold text-text-2 transition-colors duration-200 ease-out hover:text-text"
                >
                  Pausar seleccionados
                </ConfirmSubmitButton>
              </form>
              <form action={bulkToggleAdSetStatusAction} className="flex items-center gap-3">
                <input type="hidden" name="adset_ids" value={[...selectedIds].join(',')} />
                <input type="hidden" name="next_status" value="ACTIVE" />
                <input type="hidden" name="return_to" value={returnTo} />
                <ConfirmSubmitButton
                  confirmMessage={`¿Reactivar ${selectedCount} conjunto(s) seleccionado(s)? Esto puede generar gasto real.`}
                  className="text-xs font-semibold text-text-2 transition-colors duration-200 ease-out hover:text-text"
                >
                  Reactivar seleccionados
                </ConfirmSubmitButton>
              </form>
              {selectedCount >= 2 && (
                <button
                  type="button"
                  onClick={() => router.push(`/meta-ads/campaigns/${campaignId}/compare-adsets?adsets=${[...selectedIds].join(',')}`)}
                  className="rounded-control bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_12px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
                >
                  Comparar conjuntos
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
                  <th className="sticky left-10 z-10 w-[220px] min-w-[220px] max-w-[220px] border-r border-border bg-surface px-4 py-1.5">
                    Conjunto
                  </th>
                  <SortableTh label="Estado" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableTh label="Presupuesto" sortKey="budget" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableTh label="Fecha de Creación" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  {visibleColumns.map((column) => (
                    <SortableTh key={column.id} label={column.label} sortKey={column.id} activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((adSet) => (
                  <tr key={adSet.id} className="divide-x divide-divider border-b border-divider last:border-0">
                    <td
                      className={`sticky left-0 z-10 w-10 border-r border-border bg-surface px-4 py-1.5 ${
                        adSet.effectiveStatus === 'ACTIVE' ? 'border-l-[3px] border-l-green' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(adSet.id)}
                        onChange={() => toggleSelected(adSet.id)}
                        className="accent-accent"
                        aria-label={`Seleccionar ${adSet.name}`}
                      />
                    </td>
                    <td className="sticky left-10 z-10 w-[220px] min-w-[220px] max-w-[220px] border-r border-border bg-surface px-4 py-1.5">
                      <div className="truncate font-medium text-text" title={adSet.name}>
                        {adSet.name}
                      </div>
                    </td>
                    <td className="px-5 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <StrategicStatusDot metrics={adSet} targets={targets} />
                        {TOGGLEABLE.has(adSet.effectiveStatus) ? (
                          <AdSetStatusToggle
                            adSetId={adSet.id}
                            adSetName={adSet.name}
                            effectiveStatus={adSet.effectiveStatus}
                            spend={adSet.spend}
                            returnTo={returnTo}
                          />
                        ) : (
                          <span
                            className={`whitespace-nowrap rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                              STATUS_COLOR[adSet.effectiveStatus] ?? 'text-text-2'
                            }`}
                          >
                            {STATUS_LABEL[adSet.effectiveStatus] ?? adSet.effectiveStatus}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-1.5 text-center text-sm font-semibold text-text-2">
                      {formatBudget(
                        adSet.dailyBudget !== null ? convertAmount(adSet.dailyBudget, accountCurrency, displayCurrency, usdArsRate) : null,
                        adSet.lifetimeBudget !== null
                          ? convertAmount(adSet.lifetimeBudget, accountCurrency, displayCurrency, usdArsRate)
                          : null,
                        displayCurrency
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-1.5 text-center text-sm text-text-2">
                      {adSet.createdAt ? new Date(adSet.createdAt).toLocaleDateString('es-AR') : '—'}
                    </td>
                    {visibleColumns.map((column) => (
                      <td key={column.id} className="whitespace-nowrap px-5 py-1.5 text-center text-sm font-semibold">
                        {column.render(adSet, targets)}
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
