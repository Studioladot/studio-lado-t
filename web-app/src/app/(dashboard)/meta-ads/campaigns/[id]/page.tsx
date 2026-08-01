import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getMetaCampaignHeader, getMetaCampaignAdSets, getMetaCampaignAds } from '@/lib/meta/campaigns'
import { getCampaignTargets } from '@/lib/meta/autopilot'
import { toggleCampaignStatusAction } from '../actions'
import { BudgetEditor } from './budget-editor'
import { AdSetsWorkspace } from './adsets-workspace'
import { AdsWorkspace } from './ads-workspace'
import { AutopilotPanel } from '../autopilot-panel'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { STATUS_LABEL, STATUS_COLOR, TOGGLEABLE, formatObjective } from '../status'

export default async function MetaAdsCampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ campaign_error?: string; campaign_success?: string }>
}) {
  const { id } = await params
  const { campaign_error: campaignError, campaign_success: campaignSuccess } = await searchParams
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
    .select('token, expires_at')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  const tokenExpired = connection?.expires_at ? new Date(connection.expires_at) < new Date() : false

  if (!connection || tokenExpired) {
    notFound()
  }

  const [header, adSetsResult, adsResult, targets] = await Promise.all([
    getMetaCampaignHeader(connection.token, id),
    getMetaCampaignAdSets(connection.token, id),
    getMetaCampaignAds(connection.token, id),
    getCampaignTargets(supabase, activeOrganizationId, id),
  ])

  if (!header.ok) {
    notFound()
  }

  const campaign = header.campaign
  const returnTo = `/meta-ads/campaigns/${id}`

  return (
    <div>
      <Link
        href="/meta-ads/campaigns"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2L4 7l5 5" />
        </svg>
        Campañas
      </Link>

      {campaignError && (
        <div className="mb-4 rounded-control border border-red/30 bg-red/[8%] px-4 py-2.5 text-sm text-red">
          {campaignError}
        </div>
      )}
      {campaignSuccess && !campaignError && (
        <div className="mb-4 rounded-control border border-green/30 bg-green/[8%] px-4 py-2.5 text-sm text-green">
          Listo — el cambio se aplicó en Meta Ads.
        </div>
      )}

      <div className="mb-3.5 rounded-card border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[19px] font-bold tracking-[-0.02em] text-text">{campaign.name}</h1>
              <span
                className={`shrink-0 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  STATUS_COLOR[campaign.effectiveStatus] ?? 'text-text-2'
                }`}
              >
                {STATUS_LABEL[campaign.effectiveStatus] ?? campaign.effectiveStatus}
              </span>
              <AutopilotPanel campaignId={campaign.id} campaignName={campaign.name} />
            </div>
            <p className="mt-1 text-[13px] text-text-2">{formatObjective(campaign.objective)}</p>
          </div>

          {TOGGLEABLE.has(campaign.effectiveStatus) && (
            <form action={toggleCampaignStatusAction}>
              <input type="hidden" name="campaign_id" value={campaign.id} />
              <input
                type="hidden"
                name="next_status"
                value={campaign.effectiveStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'}
              />
              <input type="hidden" name="return_to" value={returnTo} />
              <ConfirmSubmitButton
                confirmMessage={
                  campaign.effectiveStatus === 'ACTIVE'
                    ? `¿Pausar "${campaign.name}"? Deja de mostrarse de inmediato.`
                    : `¿Reactivar "${campaign.name}"? Vuelve a gastar presupuesto real.`
                }
                className="shrink-0 rounded-control border border-border bg-surface px-4 py-2 text-xs font-bold text-text transition-all duration-200 ease-out hover:bg-surface-2 active:scale-[0.98]"
              >
                {campaign.effectiveStatus === 'ACTIVE' ? 'Pausar' : 'Reactivar'}
              </ConfirmSubmitButton>
            </form>
          )}
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-3">Presupuesto</p>
          <BudgetEditor
            campaignId={campaign.id}
            dailyBudget={campaign.dailyBudget}
            lifetimeBudget={campaign.lifetimeBudget}
            returnTo={returnTo}
          />
        </div>
      </div>

      <div className="mb-3.5">
        {!adSetsResult.ok ? (
          <>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-text-3">
              Conjuntos de anuncios (30 días)
            </p>
            <div className="rounded-card border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">
              {adSetsResult.error}
            </div>
          </>
        ) : adSetsResult.adSets.length === 0 ? (
          <>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-text-3">
              Conjuntos de anuncios (30 días)
            </p>
            <div className="rounded-card border border-border bg-surface px-6 py-8 text-center text-sm text-text-2">
              Esta campaña no tiene conjuntos de anuncios.
            </div>
          </>
        ) : (
          <AdSetsWorkspace adSets={adSetsResult.adSets} campaignId={id} returnTo={returnTo} targets={targets} />
        )}
      </div>

      <div>
        {!adsResult.ok ? (
          <>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-text-3">Anuncios (30 días)</p>
            <div className="rounded-card border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">
              {adsResult.error}
            </div>
          </>
        ) : adsResult.ads.length === 0 ? (
          <>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-text-3">Anuncios (30 días)</p>
            <div className="rounded-card border border-border bg-surface px-6 py-8 text-center text-sm text-text-2">
              Esta campaña no tiene anuncios.
            </div>
          </>
        ) : (
          <AdsWorkspace ads={adsResult.ads} campaignId={id} returnTo={returnTo} targets={targets} />
        )}
      </div>
    </div>
  )
}
