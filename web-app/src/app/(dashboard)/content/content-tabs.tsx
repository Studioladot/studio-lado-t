'use client'

import { useState } from 'react'
import { ControlPanel } from './control-panel'
import { PublicationsGrid } from './publications-grid'
import type { Database } from '@/lib/types/database.types'

type Post = Database['public']['Tables']['content_posts']['Row']
type Piece = Database['public']['Tables']['content_piezas']['Row']
type Campaign = Database['public']['Tables']['content_campaigns']['Row']

const TABS = [
  { value: 'control', label: 'Control' },
  { value: 'publicaciones', label: 'Publicaciones' },
] as const

export function ContentTabs({ posts, pieces, campaigns }: { posts: Post[]; pieces: Piece[]; campaigns: Campaign[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('control')

  return (
    <div>
      <div className="mb-5 flex gap-0 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`px-4 pb-2.5 text-[13px] font-semibold transition-colors duration-200 ease-out ${
              tab === t.value
                ? 'border-b-2 border-accent text-accent'
                : 'border-b-2 border-transparent text-text-2 hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'control' ? (
        <ControlPanel posts={posts} pieces={pieces} campaigns={campaigns} />
      ) : (
        <PublicationsGrid posts={posts} pieces={pieces} campaigns={campaigns} />
      )}
    </div>
  )
}
