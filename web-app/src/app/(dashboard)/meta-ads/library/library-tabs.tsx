'use client'

import { useState } from 'react'
import { LibraryGrid } from './library-grid'
import { MetaAssetsGrid } from './meta-assets-grid'
import type { LibraryCreative } from '@/lib/meta/library'
import type { MetaAccountAd } from '@/lib/meta/campaigns'
import type { CampaignTargets } from '@/lib/meta/autopilot'

// Mismo patrón de pestañas underline+accent que content-tabs.tsx.
const TABS = [
  { value: 'local', label: 'Inventario Local' },
  { value: 'meta', label: 'Activos en Meta' },
] as const

export function LibraryTabs({
  creatives,
  metaAds,
  metaAdsError,
  targetsBulk,
}: {
  creatives: LibraryCreative[]
  metaAds: MetaAccountAd[]
  metaAdsError: string | null
  targetsBulk: { accountDefault: CampaignTargets; overrides: Record<string, CampaignTargets> }
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('local')

  return (
    <div>
      <div className="mb-5 flex gap-0 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`px-4 pb-2.5 text-[13px] font-semibold transition-colors duration-200 ease-out ${
              tab === t.value ? 'border-b-2 border-accent text-accent' : 'border-b-2 border-transparent text-text-2 hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'local' ? (
        <LibraryGrid creatives={creatives} />
      ) : metaAdsError ? (
        <div className="rounded-card border border-red/30 bg-red/[6%] px-6 py-12 text-center">
          <p className="text-sm font-medium text-red">No pudimos traer los anuncios de Meta</p>
          <p className="mt-1 text-xs text-text-2">{metaAdsError}</p>
        </div>
      ) : (
        <MetaAssetsGrid ads={metaAds} targetsBulk={targetsBulk} />
      )}
    </div>
  )
}
