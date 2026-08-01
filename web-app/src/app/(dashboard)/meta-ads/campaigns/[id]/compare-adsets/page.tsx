import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getMetaAdSetsByIds, type MetaAdSet } from '@/lib/meta/campaigns'
import { buildMetricColumns, DEFAULT_COLUMN_IDS, type MetricColumn } from '../../metric-defs'
import { formatBudget } from '../../status'
import type { Currency } from '@/lib/currency'

// Mismo esqueleto que ../compare/page.tsx (Comparador de Anuncios), sin las
// cards de creativo ni el panel de Diagnóstico automático — los conjuntos no
// tienen creative propio y el diagnóstico está pensado para hook rate/creativo,
// específico de anuncios. Recorre buildMetricColumns (metric-defs.tsx) en vez
// de una lista fija, para que el comparador siempre muestre las mismas
// métricas/formato que la tabla de Conjuntos.
//
// Server component: no tiene acceso al Context de moneda (localStorage es
// client-only), así que siempre muestra en la moneda nativa de la cuenta,
// sin conversión — simplificación consciente para esta vista secundaria,
// no un descuido.

function bestAdSetId(adSets: MetaAdSet[], column: MetricColumn): string | null {
  if (column.higherIsBetter === null) return null
  const withValue = adSets.filter((a) => column.value(a) > 0)
  if (withValue.length < 2) return null
  const sorted = [...withValue].sort((a, b) =>
    column.higherIsBetter ? column.value(b) - column.value(a) : column.value(a) - column.value(b)
  )
  if (column.value(sorted[0]) === column.value(sorted[sorted.length - 1])) return null
  return sorted[0].id
}

export default async function CompareAdSetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ adsets?: string }>
}) {
  const { id } = await params
  const { adsets: adSetsParam = '' } = await searchParams
  const adSetIds = adSetsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const backLink = (
    <Link
      href={`/meta-ads/campaigns/${id}`}
      className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2L4 7l5 5" />
      </svg>
      Volver a la campaña
    </Link>
  )

  if (adSetIds.length < 2) {
    return (
      <div>
        {backLink}
        <div className="rounded-card border border-border bg-surface px-6 py-16 text-center text-sm text-text-2">
          Elegí al menos dos conjuntos en la tabla de la campaña para compararlos.
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: connection } = await supabase
    .from('meta_connections')
    .select('token, expires_at, account_currency')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  const tokenExpired = connection?.expires_at ? new Date(connection.expires_at) < new Date() : false
  if (!connection || tokenExpired) {
    notFound()
  }

  const result = await getMetaAdSetsByIds(connection.token, adSetIds)

  if (!result.ok) {
    return (
      <div>
        {backLink}
        <div className="rounded-card border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">{result.error}</div>
      </div>
    )
  }

  const adSets = result.adSets
  const accountCurrency: Currency = connection.account_currency === 'ARS' ? 'ARS' : 'USD'
  // Mismas columnas activas por default que la tabla — el comparador refleja
  // el mismo set de métricas, no una lista aparte a mantener sincronizada.
  const rows = buildMetricColumns({ displayCurrency: accountCurrency, accountCurrency, usdArsRate: null }).filter((c) =>
    DEFAULT_COLUMN_IDS.includes(c.id)
  )

  return (
    <div>
      {backLink}

      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Comparador de Conjuntos</h1>
        <p className="mt-0.5 text-[13px] text-text-2">{adSets.length} conjuntos seleccionados — últimos 30 días</p>
      </div>

      <div className="mb-5 grid gap-4" style={{ gridTemplateColumns: `repeat(${adSets.length}, minmax(0, 1fr))` }}>
        {adSets.map((adSet) => (
          <div key={adSet.id} className="rounded-card border border-border bg-surface p-4">
            <p className="truncate text-sm font-semibold text-text" title={adSet.name}>
              {adSet.name}
            </p>
            <p className="mt-1 text-xs text-text-2">{formatBudget(adSet.dailyBudget, adSet.lifetimeBudget, accountCurrency)}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="divide-x divide-border border-b border-border text-left text-[10px] font-bold uppercase tracking-wide text-text-3">
              <th className="px-5 py-3.5">Métrica</th>
              {adSets.map((adSet) => (
                <th key={adSet.id} className="whitespace-nowrap px-5 py-3.5 text-right">
                  {adSet.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((column) => {
              const winnerId = bestAdSetId(adSets, column)
              return (
                <tr key={column.id} className="divide-x divide-border border-b border-border last:border-0">
                  <td className="px-5 py-3.5 font-medium text-text-2">{column.label}</td>
                  {adSets.map((adSet) => (
                    <td
                      key={adSet.id}
                      className={`whitespace-nowrap px-5 py-3.5 text-right ${
                        adSet.id === winnerId ? 'font-bold text-green' : 'text-text'
                      }`}
                    >
                      {column.render(adSet)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
