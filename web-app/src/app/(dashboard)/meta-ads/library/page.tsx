import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getLibraryCreatives } from '@/lib/meta/library'
import { getMetaAccountAds, type MetaAccountAd } from '@/lib/meta/campaigns'
import { getAllCampaignTargets } from '@/lib/meta/autopilot'
import { LibraryTabs } from './library-tabs'

export default async function MetaAdsLibraryPage() {
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

  // getMetaAccountAds (Graph API, la llamada lenta) no depende de
  // creatives/targetsBulk (Supabase) — antes esperaba a que esas dos
  // terminen para recién arrancar, en vez de correr las tres en paralelo
  // (auditoría de performance, 2026-08-01).
  const [creatives, targetsBulk, metaAdsResult] = await Promise.all([
    getLibraryCreatives(supabase, activeOrganizationId),
    getAllCampaignTargets(supabase, activeOrganizationId),
    connection && !tokenExpired ? getMetaAccountAds(connection.token, connection.account_id) : Promise.resolve(null),
  ])

  let metaAds: MetaAccountAd[] = []
  let metaAdsError: string | null = null

  if (!connection) {
    metaAdsError = 'Meta Ads no está conectado.'
  } else if (tokenExpired) {
    metaAdsError = 'Tu conexión con Meta Ads venció — reconectá para ver los anuncios en vivo.'
  } else if (metaAdsResult) {
    if (metaAdsResult.ok) {
      metaAds = metaAdsResult.ads
    } else {
      metaAdsError = metaAdsResult.error
    }
  }

  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Biblioteca de Ads</h1>
        <p className="mt-0.5 max-w-[560px] text-[13px] text-text-2">
          Banco de creativos listos para lanzar, y lo que ya está corriendo de verdad en tu cuenta de Meta — en un solo
          lugar.
        </p>
      </div>

      <LibraryTabs creatives={creatives} metaAds={metaAds} metaAdsError={metaAdsError} targetsBulk={targetsBulk} />
    </div>
  )
}
