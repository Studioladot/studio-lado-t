'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { MetaCampaign } from '@/lib/meta/campaigns'
import { bulkToggleCampaignStatusAction } from './actions'
import { STATUS_LABEL, STATUS_COLOR, TOGGLEABLE, formatObjective } from './status'
import { buildMetricColumns, METRIC_LABELS, METRIC_CELL_CLASS, DEFAULT_COLUMN_IDS, COLUMNS_STORAGE_KEY, type MetricColumnId } from './metric-defs'
import { SortableTh, type SortDirection } from './sortable-th'
import { CampaignsFilters } from './campaigns-filters'
import { CampaignsHeaderMenu } from './campaigns-header-menu'
import { ColumnsPopover } from './columns-popover'
import { CampaignStatusToggle } from './campaign-status-toggle'
import { StrategicStatusDot } from './strategic-status-dot'
import { InlineBudgetCell } from './inline-budget-cell'
import { ScaleCampaignButton } from './scale-campaign-button'
import { PillarBadge } from '@/components/features/pillar-badge'
import { resolveCampaignTargets, getStrategicStatus, type CampaignTargets } from '@/lib/meta/autopilot'
import { useCurrency } from '@/lib/context/currency-context'
import { FocusCards } from './focus-cards'
import { Pagination } from './pagination'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { LaunchTestCampaignModal } from './new/launch-test-campaign-modal'

// Auditoría de performance (2026-08-01): AutopilotPanel se monta una vez
// POR FILA de esta tabla (cada campaña tiene la suya) — antes su JS (más
// el de UnitEconomicsModal, que vive adentro) se sumaba entero a la carga
// inicial de la página más visitada de Meta Ads, para todas las filas,
// aunque el usuario nunca abra ninguna. ssr:false porque el trigger de
// cada fila es un ícono chico — perder su SSR es un costo mínimo frente al
// peso que saca de la carga inicial.
const AutopilotPanel = dynamic(() => import('./autopilot-panel').then((m) => m.AutopilotPanel), { ssr: false })

const PAGE_SIZE = 10

type CampaignSortKey = 'status' | 'budget' | 'createdAt' | MetricColumnId

export function CampaignsWorkspace({
  campaigns,
  returnTo,
  defaultQuery,
  defaultStatus,
  defaultRange,
  targetsBulk,
  campaignPillars,
}: {
  campaigns: MetaCampaign[]
  returnTo: string
  defaultQuery: string
  defaultStatus: string
  defaultRange: string
  targetsBulk: { accountDefault: CampaignTargets; overrides: Record<string, CampaignTargets> }
  campaignPillars: Record<string, string>
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeColumns, setActiveColumns] = useState<MetricColumnId[]>(DEFAULT_COLUMN_IDS)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [page, setPage] = useState(1)
  // Qué fila tiene el panel de Automatización abierto — se resalta sutilmente
  // esa fila y el resto queda con el fondo oscuro normal de la tabla, en vez
  // de que el backdrop del panel corredizo se mezcle mal con la tabla.
  const [autopilotOpenId, setAutopilotOpenId] = useState<string | null>(null)

  // Un filtro nuevo trae una lista distinta — si nos quedamos en la página 4
  // de la lista vieja podemos caer fuera de rango de la nueva. Se ajusta
  // durante el render (mismo patrón que sidebar-nav.tsx) en vez de un
  // Effect, para no disparar un setState síncrono dentro de un efecto.
  const [prevFilterKey, setPrevFilterKey] = useState(`${defaultQuery}|${defaultStatus}|${defaultRange}`)
  const filterKey = `${defaultQuery}|${defaultStatus}|${defaultRange}`
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setPage(1)
  }

  // localStorage no existe durante el render del servidor — se carga después
  // del mount, mismo criterio que loadMetaColumns() en app.html:6621. No se
  // puede leer en el inicializador de useState (rompería la hidratación: el
  // primer render del cliente tiene que calzar con el HTML que mandó el
  // servidor), así que esto es una lectura real de un sistema externo tras
  // el mount — el caso que react-hooks/set-state-in-effect explícitamente
  // permite, no uno que la regla debería estar evitando.
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

  const { displayCurrency, accountCurrency, usdArsRate } = useCurrency()
  const metricColumns = useMemo(
    () => buildMetricColumns({ displayCurrency, accountCurrency, usdArsRate }),
    [displayCurrency, accountCurrency, usdArsRate]
  )
  const visibleColumns = metricColumns.filter((m) => activeColumns.includes(m.id))

  // Ordenamiento (2026-07-27) — primer clic en una columna ordena de mayor a
  // menor, un segundo clic invierte. "Estado"/"Presupuesto"/"Fecha de
  // Creación" no son MetricColumn (son atributos fijos, no métricas de
  // performance), así que tienen su propio accessor acá en vez de vivir en
  // metric-defs.tsx.
  const [sortKey, setSortKey] = useState<CampaignSortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  function handleSort(key: CampaignSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function getSortValue(campaign: MetaCampaign, key: CampaignSortKey): number | string {
    if (key === 'status') return campaign.effectiveStatus
    if (key === 'budget') return campaign.dailyBudget ?? campaign.lifetimeBudget ?? 0
    if (key === 'createdAt') return campaign.createdAt ? new Date(campaign.createdAt).getTime() : 0
    return metricColumns.find((c) => c.id === key)?.value(campaign) ?? 0
  }

  const sortedCampaigns = useMemo(() => {
    if (!sortKey) return campaigns
    const sorted = [...campaigns].sort((a, b) => {
      const av = getSortValue(a, sortKey)
      const bv = getSortValue(b, sortKey)
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns, sortKey, sortDir, metricColumns])

  const selectedCount = selectedIds.size
  const pageCount = Math.max(1, Math.ceil(sortedCampaigns.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pagedCampaigns = sortedCampaigns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Campañas</h1>
          <p className="mt-0.5 text-[13px] text-text-2">Campañas de Meta Ads de esta cuenta</p>
        </div>
        <div className="flex items-center gap-2">
          <LaunchTestCampaignModal />
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
          <CampaignsHeaderMenu focusMode={focusMode} onToggleFocusMode={() => setFocusMode((v) => !v)} />
        </div>
      </div>

      <CampaignsFilters defaultQuery={defaultQuery} defaultStatus={defaultStatus} defaultRange={defaultRange} />

      {focusMode ? (
        <FocusCards campaigns={campaigns} />
      ) : campaigns.length === 0 ? (
        <div className="rounded-card border border-border bg-surface px-6 py-16 text-center text-sm text-text-2">
          Ninguna campaña coincide con el filtro.
        </div>
      ) : (
        <>
          {selectedCount > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-control border border-accent/30 bg-accent/[0.06] px-4 py-2.5">
              <span className="text-xs font-semibold text-text">
                {selectedCount} campaña{selectedCount === 1 ? '' : 's'} seleccionada{selectedCount === 1 ? '' : 's'}
              </span>
              <form action={bulkToggleCampaignStatusAction} className="flex items-center gap-3">
                <input type="hidden" name="campaign_ids" value={[...selectedIds].join(',')} />
                <input type="hidden" name="next_status" value="PAUSED" />
                <input type="hidden" name="return_to" value={returnTo} />
                <ConfirmSubmitButton
                  confirmMessage={`¿Pausar ${selectedCount} campaña(s) seleccionada(s)?`}
                  className="text-xs font-semibold text-text-2 transition-colors duration-200 ease-out hover:text-text"
                >
                  Pausar seleccionadas
                </ConfirmSubmitButton>
              </form>
              <form action={bulkToggleCampaignStatusAction} className="flex items-center gap-3">
                <input type="hidden" name="campaign_ids" value={[...selectedIds].join(',')} />
                <input type="hidden" name="next_status" value="ACTIVE" />
                <input type="hidden" name="return_to" value={returnTo} />
                <ConfirmSubmitButton
                  confirmMessage={`¿Reactivar ${selectedCount} campaña(s) seleccionada(s)? Esto puede generar gasto real.`}
                  className="text-xs font-semibold text-text-2 transition-colors duration-200 ease-out hover:text-text"
                >
                  Reactivar seleccionadas
                </ConfirmSubmitButton>
              </form>
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
                    Campaña
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
                {pagedCampaigns.map((campaign) => {
                  const rowHighlighted = campaign.id === autopilotOpenId
                  const stickyBg = rowHighlighted ? 'bg-accent/[0.06]' : 'bg-surface'
                  const campaignTargets = resolveCampaignTargets(campaign.id, targetsBulk)
                  const canScale = campaign.effectiveStatus === 'ACTIVE' && getStrategicStatus(campaign, campaignTargets)?.label === 'escalar'
                  return (
                  <tr
                    key={campaign.id}
                    className={`divide-x divide-divider border-b border-divider last:border-0 transition-colors duration-200 ease-out ${
                      rowHighlighted ? 'bg-accent/[0.04]' : ''
                    }`}
                  >
                    <td
                      className={`sticky left-0 z-10 w-10 border-r border-border px-4 py-1.5 ${stickyBg} ${
                        campaign.effectiveStatus === 'ACTIVE' ? 'border-l-[3px] border-l-green' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(campaign.id)}
                        onChange={() => toggleSelected(campaign.id)}
                        className="accent-accent"
                        aria-label={`Seleccionar ${campaign.name}`}
                      />
                    </td>
                    <td className={`sticky left-10 z-10 w-[220px] min-w-[220px] max-w-[220px] border-r border-border px-4 py-1.5 ${stickyBg}`}>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/meta-ads/campaigns/${campaign.id}`}
                          className="block min-w-0 flex-1 truncate font-medium text-text transition-colors duration-200 ease-out hover:text-accent"
                        >
                          {campaign.name}
                        </Link>
                        <AutopilotPanel
                          campaignId={campaign.id}
                          campaignName={campaign.name}
                          metrics={campaign}
                          onOpenChange={(isOpen) => setAutopilotOpenId(isOpen ? campaign.id : null)}
                        />
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="truncate text-[11px] text-text-3">{formatObjective(campaign.objective)}</span>
                        {campaignPillars[campaign.id] && <PillarBadge pillar={campaignPillars[campaign.id]} />}
                      </div>
                    </td>
                    <td className="px-5 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <StrategicStatusDot metrics={campaign} targets={campaignTargets} />
                        {TOGGLEABLE.has(campaign.effectiveStatus) ? (
                          <CampaignStatusToggle
                            campaignId={campaign.id}
                            campaignName={campaign.name}
                            effectiveStatus={campaign.effectiveStatus}
                            spend={campaign.spend}
                            returnTo={returnTo}
                          />
                        ) : (
                          <span
                            className={`whitespace-nowrap rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                              STATUS_COLOR[campaign.effectiveStatus] ?? 'text-text-2'
                            }`}
                          >
                            {STATUS_LABEL[campaign.effectiveStatus] ?? campaign.effectiveStatus}
                          </span>
                        )}
                        {canScale && (
                          <ScaleCampaignButton
                            campaignId={campaign.id}
                            dailyBudget={campaign.dailyBudget}
                            lifetimeBudget={campaign.lifetimeBudget}
                            returnTo={returnTo}
                          />
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-1.5 text-center text-sm font-semibold text-text-2">
                      <InlineBudgetCell
                        campaignId={campaign.id}
                        dailyBudget={campaign.dailyBudget}
                        lifetimeBudget={campaign.lifetimeBudget}
                        returnTo={returnTo}
                      />
                    </td>
                    <td className="whitespace-nowrap px-5 py-1.5 text-center text-sm text-text-2">
                      {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString('es-AR') : '—'}
                    </td>
                    {visibleColumns.map((column) => (
                      <td key={column.id} className={METRIC_CELL_CLASS[column.tier]}>
                        {column.render(campaign, campaignTargets)}
                      </td>
                    ))}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination page={currentPage} totalPages={pageCount} onChange={setPage} />
        </>
      )}
    </div>
  )
}
