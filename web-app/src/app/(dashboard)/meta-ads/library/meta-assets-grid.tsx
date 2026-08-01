'use client'

import type { MetaAccountAd } from '@/lib/meta/campaigns'
import { resolveCampaignTargets, cpaColorByTargets, roasColorByTargets, type CampaignTargets } from '@/lib/meta/autopilot'
import { useCurrency } from '@/lib/context/currency-context'
import { convertAmount, formatMoney } from '@/lib/currency'

// Solo lectura, a propósito — es monitoreo de lo que ya está corriendo de
// verdad en la cuenta, no un origen para el pool de rotación del Autopiloto
// (ese sigue siendo únicamente library_creatives con status='active').

export function MetaAssetsGrid({
  ads,
  targetsBulk,
}: {
  ads: MetaAccountAd[]
  targetsBulk: { accountDefault: CampaignTargets; overrides: Record<string, CampaignTargets> }
}) {
  const { displayCurrency, accountCurrency, usdArsRate } = useCurrency()

  if (ads.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface px-6 py-12 text-center">
        <p className="text-sm font-medium text-text">Sin anuncios activos en Meta</p>
        <p className="mt-1 text-xs text-text-2">Acá vas a ver lo que ya está corriendo de verdad en tu cuenta.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {ads.map((ad) => {
        const targets = ad.campaignId ? resolveCampaignTargets(ad.campaignId, targetsBulk) : targetsBulk.accountDefault
        const spend = convertAmount(ad.spend, accountCurrency, displayCurrency, usdArsRate)
        const cpa = convertAmount(ad.cpa, accountCurrency, displayCurrency, usdArsRate)

        return (
          <div key={ad.id} className="flex flex-col overflow-hidden rounded-card border border-border bg-surface">
            <div className="flex h-[140px] w-full items-center justify-center overflow-hidden bg-surface-2">
              {ad.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ad.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <p className="text-[10px] text-text-3">Sin miniatura</p>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-text" title={ad.name}>
                  {ad.name}
                </p>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    ad.effectiveStatus === 'ACTIVE' ? 'border-green/40 bg-green/[8%] text-green' : 'border-border text-text-2'
                  }`}
                >
                  {ad.effectiveStatus === 'ACTIVE' ? 'Activo' : 'Pausado'}
                </span>
              </div>
              <p className="truncate text-[11px] text-text-3" title={ad.campaignName}>
                {ad.campaignName}
              </p>

              <div className="mt-1 grid grid-cols-2 gap-2 border-t border-border pt-2.5">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-text-3">Gasto</p>
                  <p className="tabular-nums text-xs font-semibold text-text">{formatMoney(spend, displayCurrency, 0)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-text-3">CPA</p>
                  <p className={`tabular-nums text-xs font-semibold ${cpaColorByTargets(ad.cpa, targets)}`}>
                    {ad.cpa > 0 ? formatMoney(cpa, displayCurrency, 0) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-text-3">ROAS</p>
                  <p className={`tabular-nums text-xs font-semibold ${roasColorByTargets(ad.roas, targets)}`}>
                    {ad.roas > 0 ? `${ad.roas.toFixed(2)}x` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-text-3">CTR</p>
                  <p className="tabular-nums text-xs font-semibold text-text">{ad.ctr.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
