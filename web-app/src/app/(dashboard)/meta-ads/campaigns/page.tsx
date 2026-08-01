import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getMetaCampaigns } from '@/lib/meta/campaigns'
import { getAllCampaignTargets } from '@/lib/meta/autopilot'
import { PAUSED_LIKE } from './status'
import { CampaignsWorkspace } from './campaigns-workspace'

export default async function MetaAdsCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; range?: string; campaign_error?: string; campaign_success?: string }>
}) {
  const {
    q = '',
    status: statusFilter = '',
    range = '30',
    campaign_error: campaignError,
    campaign_success: campaignSuccess,
  } = await searchParams

  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: connection } = await supabase
    .from('meta_connections')
    .select('account_id, token, expires_at')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  const tokenExpired = connection?.expires_at ? new Date(connection.expires_at) < new Date() : false
  const days = Number(range) || 30
  const result =
    connection && !tokenExpired ? await getMetaCampaigns(connection.token, connection.account_id, days) : null

  let campaigns = result && result.ok ? result.campaigns : []

  if (q.trim()) {
    const needle = q.trim().toLowerCase()
    campaigns = campaigns.filter((c) => c.name.toLowerCase().includes(needle))
  }
  if (statusFilter === 'active') {
    campaigns = campaigns.filter((c) => c.effectiveStatus === 'ACTIVE')
  } else if (statusFilter === 'paused') {
    campaigns = campaigns.filter((c) => PAUSED_LIKE.has(c.effectiveStatus))
  } else if (statusFilter === 'other') {
    campaigns = campaigns.filter((c) => c.effectiveStatus !== 'ACTIVE' && !PAUSED_LIKE.has(c.effectiveStatus))
  }

  const targetsBulk = await getAllCampaignTargets(supabase, activeOrganizationId)

  const banner = campaignError
    ? { tone: 'error' as const, message: campaignError }
    : campaignSuccess
      ? { tone: 'ok' as const, message: 'Listo — el cambio se aplicó en Meta Ads.' }
      : null

  return (
    <div>
      {banner && (
        <div
          className={`mb-4 rounded-control border px-4 py-2.5 text-sm ${
            banner.tone === 'ok' ? 'border-green/30 bg-green/[8%] text-green' : 'border-red/30 bg-red/[8%] text-red'
          }`}
        >
          {banner.message}
        </div>
      )}

      {!connection ? (
        <>
          <div className="mb-[22px]">
            <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Campañas</h1>
            <p className="mt-0.5 text-[13px] text-text-2">Campañas de Meta Ads de esta cuenta</p>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-6 py-16 text-center">
            <p className="text-sm font-medium text-text">Todavía no conectaste Meta Ads</p>
            <p className="max-w-[320px] text-xs text-text-2">Conectá tu cuenta publicitaria para ver tus campañas acá.</p>
            <Link
              href="/settings/integrations"
              className="mt-1 rounded-control bg-primary px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
            >
              Ir a Conexiones
            </Link>
          </div>
        </>
      ) : tokenExpired ? (
        <>
          <div className="mb-[22px]">
            <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Campañas</h1>
            <p className="mt-0.5 text-[13px] text-text-2">Campañas de Meta Ads de esta cuenta</p>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-card border border-amber/30 bg-amber/[6%] px-6 py-16 text-center">
            <p className="text-sm font-medium text-text">Tu conexión con Meta Ads venció</p>
            <p className="max-w-[320px] text-xs text-text-2">Reconectá para volver a ver tus campañas.</p>
            <Link
              href="/settings/integrations"
              className="mt-1 rounded-control bg-primary px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
            >
              Reconectar
            </Link>
          </div>
        </>
      ) : result && !result.ok ? (
        <>
          <div className="mb-[22px]">
            <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Campañas</h1>
            <p className="mt-0.5 text-[13px] text-text-2">Campañas de Meta Ads de esta cuenta</p>
          </div>
          <div className="rounded-card border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">{result.error}</div>
        </>
      ) : (
        <CampaignsWorkspace
          campaigns={campaigns}
          returnTo="/meta-ads/campaigns"
          defaultQuery={q}
          defaultStatus={statusFilter}
          defaultRange={String(days)}
          targetsBulk={targetsBulk}
        />
      )}
    </div>
  )
}
