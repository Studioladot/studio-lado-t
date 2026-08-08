'use client'

import { useMemo, useState } from 'react'
import { ControlPanel } from './control-panel'
import { ContentCalendar } from './content-calendar'
import { PublicationsTable } from './publications-table'
import { PerformanceTab } from './performance-tab'
import { unifyContentItems } from './unified-items'
import type { WinningItem } from '@/lib/content/winners'
import type { TiktokVideoRow } from '@/lib/tiktok/winners'
import type { InstagramCatalogRow } from '@/lib/instagram/media-catalog-winners'
import type { Database } from '@/lib/types/database.types'
import type { ContentPillar } from '@/lib/content/pillars'

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
  tiktokUsername,
  tiktokVideos,
  instagramCatalog,
  gotixMediaIds,
  accountInsights,
  mediaInsights,
  winningItems,
  pillars,
}: {
  posts: Post[]
  pieces: Piece[]
  campaigns: Campaign[]
  instagramConnected: boolean
  igUsername: string | null
  tiktokConnected: boolean
  tiktokUsername: string | null
  tiktokVideos: TiktokVideoRow[]
  instagramCatalog: InstagramCatalogRow[]
  gotixMediaIds: Set<string>
  accountInsights: AccountInsight[]
  mediaInsights: MediaInsight[]
  winningItems: WinningItem[]
  pillars: ContentPillar[]
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('control')

  // Alerta "pendiente hoy" (reestructuración de Contenido, 2026-08-05) —
  // antes no existía ninguna señal de que algo estuviera cargado para hoy
  // sin subir todavía; se calcula acá (visible en cualquier tab, no solo en
  // Publicaciones) sobre el mismo unifyContentItems que ya usan Control y
  // el Calendario, sin pedir nada nuevo al server.
  const pendingToday = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    return unifyContentItems(posts, pieces, campaigns).filter((i) => i.status === 'pendiente' && i.date === todayStr)
  }, [posts, pieces, campaigns])

  return (
    <div>
      {pendingToday.length > 0 && (
        <button
          type="button"
          onClick={() => setTab('publicaciones')}
          className="mb-4 flex w-full items-center gap-3 rounded-control border border-amber/25 bg-amber/7 px-4 py-3 text-left transition-colors duration-200 ease-out hover:bg-amber/11"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber/15 text-amber">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-text">
              {pendingToday.length === 1
                ? 'Tenés 1 publicación pendiente para hoy'
                : `Tenés ${pendingToday.length} publicaciones pendientes para hoy`}
            </span>
            <span className="block truncate text-xs text-text-2">{pendingToday.map((i) => i.titulo || 'Sin título').join(' · ')}</span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-amber">Ver →</span>
        </button>
      )}

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

      {tab === 'control' && (
        <ControlPanel
          posts={posts}
          pieces={pieces}
          campaigns={campaigns}
          instagramCatalog={instagramCatalog}
          onGoToPerformance={() => setTab('rendimiento')}
        />
      )}
      {tab === 'calendario' && (
        <ContentCalendar
          posts={posts}
          pieces={pieces}
          campaigns={campaigns}
          instagramConnected={instagramConnected}
          tiktokConnected={tiktokConnected}
          mediaInsights={mediaInsights}
          pillars={pillars}
        />
      )}
      {tab === 'publicaciones' && (
        <PublicationsTable
          posts={posts}
          pieces={pieces}
          campaigns={campaigns}
          pillars={pillars}
          instagramConnected={instagramConnected}
          tiktokConnected={tiktokConnected}
        />
      )}
      {tab === 'rendimiento' && (
        <PerformanceTab
          instagramConnected={instagramConnected}
          igUsername={igUsername}
          accountInsights={accountInsights}
          winningItems={winningItems}
          tiktokConnected={tiktokConnected}
          tiktokUsername={tiktokUsername}
          tiktokVideos={tiktokVideos}
          instagramCatalog={instagramCatalog}
          gotixMediaIds={gotixMediaIds}
        />
      )}
    </div>
  )
}
