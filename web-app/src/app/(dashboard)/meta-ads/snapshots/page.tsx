import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getMetaCampaigns, getMetaCampaignAds, getMetaEntityDailyInsights } from '@/lib/meta/campaigns'
import Link from 'next/link'
import { SnapshotsWorkspace } from './snapshots-workspace'

// Snapshots real (bloque de corrección, 2026-08-03) — reemplaza el stub
// PlaceholderPage que existía antes. Control histórico diario de UN
// anuncio/conjunto puntual: CPA/ROAS/Ventas día por día, en vivo contra la
// Graph API (time_increment(1)), sin tabla ni cron nuevos — ver
// src/lib/meta/campaigns.ts:getMetaEntityDailyInsights. No hay que esperar
// a que se acumule historial: el primer día que se abre esta pantalla ya
// hay datos reales de los últimos N días.
//
// Primera campaña/entidad se resuelven acá (Server Component), no en un
// useEffect del lado del cliente — mismo criterio ya establecido en el
// resto de la app (evitar setState-en-effect para data fetching; los
// cambios de selección después sí son imperativos, vía las server actions
// de actions.ts, disparados directo desde cada onChange).
const DEFAULT_DAYS = 14

function toDateInputValue(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default async function MetaAdsSnapshotsPage() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: metaConnection } = await supabase
    .from('meta_connections')
    .select('token, account_id, expires_at, account_currency')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  const tokenExpired = metaConnection?.expires_at ? new Date(metaConnection.expires_at) < new Date() : false
  const metaUsable = !!metaConnection && !tokenExpired

  const campaignsResult = metaUsable ? await getMetaCampaigns(metaConnection.token, metaConnection.account_id, 90) : null
  const campaigns = campaignsResult?.ok ? campaignsResult.campaigns.map((c) => ({ id: c.id, name: c.name })) : []
  const firstCampaignId = campaigns[0]?.id ?? null

  const initialEntitiesResult =
    metaUsable && firstCampaignId ? await getMetaCampaignAds(metaConnection.token, firstCampaignId) : null
  const initialEntities = initialEntitiesResult?.ok ? initialEntitiesResult.ads.map((a) => ({ id: a.id, name: a.name })) : []
  const firstEntityId = initialEntities[0]?.id ?? null

  const untilDate = new Date()
  const sinceDate = new Date(untilDate.getTime() - DEFAULT_DAYS * 86400000)
  const initialSince = toDateInputValue(sinceDate)
  const initialUntil = toDateInputValue(untilDate)

  const initialSnapshot =
    metaUsable && firstEntityId
      ? await getMetaEntityDailyInsights(metaConnection.token, firstEntityId, { since: sinceDate, until: untilDate })
      : null

  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Snapshots</h1>
        <p className="mt-0.5 text-[13px] text-text-2">
          Control diario de anuncios y conjuntos — buscá, elegí un rango de fechas libre y compará dos días puntuales.
        </p>
      </div>

      {!metaConnection ? (
        <div className="flex items-center justify-between gap-4 rounded-card border border-dashed border-border bg-surface-2/40 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-text">Todavía no conectaste Meta Ads</p>
            <p className="mt-0.5 text-xs text-text-2">Conectá tu cuenta para ver el historial diario de tus anuncios y conjuntos.</p>
          </div>
          <Link
            href="/settings/integrations"
            className="shrink-0 rounded-control bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
          >
            Conectar
          </Link>
        </div>
      ) : tokenExpired ? (
        <div className="rounded-card border border-amber/30 bg-amber/[8%] px-4 py-3 text-sm text-amber">
          Tu conexión con Meta Ads venció — reconectá para ver Snapshots.
        </div>
      ) : campaignsResult && !campaignsResult.ok ? (
        <div className="rounded-card border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">{campaignsResult.error}</div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-card border border-border bg-surface px-6 py-10 text-center text-sm text-text-2">
          No encontramos campañas en tu cuenta.
        </div>
      ) : (
        <SnapshotsWorkspace
          campaigns={campaigns}
          accountCurrency={metaConnection.account_currency === 'ARS' ? 'ARS' : 'USD'}
          initialCampaignId={firstCampaignId}
          initialEntities={initialEntities}
          initialEntitiesError={initialEntitiesResult && !initialEntitiesResult.ok ? initialEntitiesResult.error : null}
          initialEntityId={firstEntityId}
          initialSince={initialSince}
          initialUntil={initialUntil}
          initialSnapshot={initialSnapshot}
        />
      )}
    </div>
  )
}
