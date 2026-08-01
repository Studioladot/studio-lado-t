'use client'

import { useState } from 'react'
import { ControlPanel } from './control-panel'
import { ContentCalendar } from './content-calendar'
import { PublicationsTable } from './publications-table'
import { PerformanceTab } from './performance-tab'
import type { WinningItem } from '@/lib/content/winners'
import type { Database } from '@/lib/types/database.types'

type Post = Database['public']['Tables']['content_posts']['Row']
type Piece = Database['public']['Tables']['content_piezas']['Row']
type Campaign = Database['public']['Tables']['content_campaigns']['Row']
export type AccountInsight = Database['public']['Tables']['instagram_account_insights']['Row']
export type MediaInsight = Database['public']['Tables']['instagram_media_insights']['Row'] & {
  content_piezas: { titulo: string; ig_permalink: string | null; formato: string | null; media_type: string | null } | null
  content_posts: { title: string | null; ig_permalink: string | null; format: string | null; media_type: string | null } | null
}

const TABS = [
  { value: 'control', label: 'Control' },
  { value: 'calendario', label: 'Calendario' },
  { value: 'publicaciones', label: 'Publicaciones' },
  { value: 'rendimiento', label: 'Rendimiento' },
] as const

export function ContentTabs({
  posts,
  pieces,
  campaigns,
  instagramConnected,
  igUsername,
  tiktokConnected,
  accountInsights,
  mediaInsights,
  winningItems,
}: {
  posts: Post[]
  pieces: Piece[]
  campaigns: Campaign[]
  instagramConnected: boolean
  igUsername: string | null
  /** Siempre false hoy — tiktok_connections existe pero no hay OAuth real todavía (Fase 2). Ver src/lib/content/winners.ts. */
  tiktokConnected: boolean
  accountInsights: AccountInsight[]
  mediaInsights: MediaInsight[]
  winningItems: WinningItem[]
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('control')

  return (
    <div>
      <div className="mb-5 flex gap-0 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`shrink-0 px-4 pb-2.5 text-[13px] font-semibold transition-colors duration-200 ease-out ${
              tab === t.value
                ? 'border-b-2 border-accent text-accent'
                : 'border-b-2 border-transparent text-text-2 hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'control' && <ControlPanel posts={posts} pieces={pieces} campaigns={campaigns} />}
      {tab === 'calendario' && (
        <ContentCalendar
          posts={posts}
          pieces={pieces}
          campaigns={campaigns}
          instagramConnected={instagramConnected}
          tiktokConnected={tiktokConnected}
          mediaInsights={mediaInsights}
        />
      )}
      {tab === 'publicaciones' && (
        <PublicationsTable
          posts={posts}
          pieces={pieces}
          campaigns={campaigns}
          instagramConnected={instagramConnected}
          tiktokConnected={tiktokConnected}
        />
      )}
      {tab === 'rendimiento' && (
        <PerformanceTab
          instagramConnected={instagramConnected}
          igUsername={igUsername}
          accountInsights={accountInsights}
          mediaInsights={mediaInsights}
          winningItems={winningItems}
        />
      )}
    </div>
  )
}
