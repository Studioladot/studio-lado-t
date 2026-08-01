import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getMetaAdsByIds, type MetaCampaignAd } from '@/lib/meta/campaigns'
import { diagnoseAds } from '@/lib/meta/ad-diagnosis'

type MetricRowSpec = {
  label: string
  // null = fila de referencia, no hay "mejor" (ej. Gasto: más o menos no es
  // en sí bueno ni malo, depende del resultado que produjo).
  higherIsBetter: boolean | null
  value: (ad: MetaCampaignAd) => number
  format: (ad: MetaCampaignAd) => string
}

const METRIC_ROWS: MetricRowSpec[] = [
  { label: 'Gasto', higherIsBetter: null, value: (a) => a.spend, format: (a) => `$${a.spend.toFixed(0)}` },
  { label: 'ROAS', higherIsBetter: true, value: (a) => a.roas, format: (a) => (a.roas > 0 ? `${a.roas.toFixed(2)}x` : '—') },
  { label: 'CPA', higherIsBetter: false, value: (a) => a.cpa, format: (a) => (a.cpa > 0 ? `$${a.cpa.toFixed(2)}` : '—') },
  { label: 'CTR', higherIsBetter: true, value: (a) => a.ctr, format: (a) => (a.ctr > 0 ? `${a.ctr.toFixed(2)}%` : '—') },
  {
    label: 'Hook Rate',
    higherIsBetter: true,
    value: (a) => a.hookRate,
    format: (a) => (a.hookRate > 0 ? `${a.hookRate.toFixed(1)}%` : '—'),
  },
  { label: 'Compras', higherIsBetter: true, value: (a) => a.purchases, format: (a) => String(a.purchases) },
]

function bestAdId(ads: MetaCampaignAd[], row: MetricRowSpec): string | null {
  if (row.higherIsBetter === null) return null
  const withValue = ads.filter((a) => row.value(a) > 0)
  if (withValue.length < 2) return null
  const sorted = [...withValue].sort((a, b) => (row.higherIsBetter ? row.value(b) - row.value(a) : row.value(a) - row.value(b)))
  if (row.value(sorted[0]) === row.value(sorted[sorted.length - 1])) return null
  return sorted[0].id
}

export default async function CompareAdsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ads?: string }>
}) {
  const { id } = await params
  const { ads: adsParam = '' } = await searchParams
  const adIds = adsParam
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

  if (adIds.length < 2) {
    return (
      <div>
        {backLink}
        <div className="rounded-card border border-border bg-surface px-6 py-16 text-center text-sm text-text-2">
          Elegí al menos dos anuncios en la tabla de la campaña para compararlos.
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: connection } = await supabase
    .from('meta_connections')
    .select('token, expires_at')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  const tokenExpired = connection?.expires_at ? new Date(connection.expires_at) < new Date() : false
  if (!connection || tokenExpired) {
    notFound()
  }

  const result = await getMetaAdsByIds(connection.token, adIds)

  if (!result.ok) {
    return (
      <div>
        {backLink}
        <div className="rounded-card border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">{result.error}</div>
      </div>
    )
  }

  const ads = result.ads
  const diagnosis = diagnoseAds(ads)

  return (
    <div>
      {backLink}

      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Comparador de Anuncios</h1>
        <p className="mt-0.5 text-[13px] text-text-2">{ads.length} anuncios seleccionados — últimos 30 días</p>
      </div>

      <div className="mb-5 grid gap-4" style={{ gridTemplateColumns: `repeat(${ads.length}, minmax(0, 1fr))` }}>
        {ads.map((ad) => (
          <div key={ad.id} className="rounded-card border border-border bg-surface p-4">
            {ad.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.thumbnailUrl} alt="" className="mb-3 aspect-square w-full rounded-control object-cover" />
            ) : (
              <div className="mb-3 flex aspect-square w-full items-center justify-center rounded-control bg-surface-2 text-xs text-text-3">
                Sin creativo
              </div>
            )}
            <p className="truncate text-sm font-semibold text-text" title={ad.name}>
              {ad.name}
            </p>
            {ad.creativeTitle && <p className="mt-1 text-xs font-medium text-text-2">{ad.creativeTitle}</p>}
            {ad.creativeBody && <p className="mt-1 line-clamp-4 text-xs text-text-3">{ad.creativeBody}</p>}
          </div>
        ))}
      </div>

      <div className="mb-5 overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="divide-x divide-border border-b border-border text-left text-[10px] font-bold uppercase tracking-wide text-text-3">
              <th className="px-5 py-3.5">Métrica</th>
              {ads.map((ad) => (
                <th key={ad.id} className="whitespace-nowrap px-5 py-3.5 text-right">
                  {ad.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRIC_ROWS.map((row) => {
              const winnerId = bestAdId(ads, row)
              return (
                <tr key={row.label} className="divide-x divide-border border-b border-border last:border-0">
                  <td className="px-5 py-3.5 font-medium text-text-2">{row.label}</td>
                  {ads.map((ad) => (
                    <td
                      key={ad.id}
                      className={`whitespace-nowrap px-5 py-3.5 text-right ${
                        ad.id === winnerId ? 'font-bold text-green' : 'text-text'
                      }`}
                    >
                      {row.format(ad)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-card border border-accent/30 bg-accent/[0.04] p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-accent">Diagnóstico automático</p>

        {diagnosis.insufficientData ? (
          <p className="text-sm text-text-2">
            Necesitamos al menos dos anuncios con gasto registrado en el período para comparar — todavía no hay datos
            suficientes acá.
          </p>
        ) : (
          <>
            {diagnosis.bullets.length === 0 ? (
              <p className="text-sm text-text-2">
                Las métricas están parejas entre los anuncios seleccionados — no encontramos diferencias mayores al
                15%.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {diagnosis.bullets.map((bullet) => (
                  <li key={bullet.metric} className="text-sm text-text-2">
                    • {bullet.text}
                  </li>
                ))}
              </ul>
            )}
            {diagnosis.recommendation && (
              <p className="mt-4 border-t border-border pt-4 text-sm font-medium text-text">{diagnosis.recommendation}</p>
            )}
          </>
        )}

        <p className="mt-4 text-[11px] text-text-3">
          Análisis basado en reglas y umbrales sobre las métricas — no es un texto generado por IA.
        </p>
      </div>
    </div>
  )
}
