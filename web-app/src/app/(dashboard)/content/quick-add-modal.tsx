'use client'

import { useState } from 'react'
import { PostForm } from './post-form'
import { AddPieceForm } from '../campaigns/[id]/add-piece-form'
import type { Database } from '@/lib/types/database.types'

type Campaign = Database['public']['Tables']['content_campaigns']['Row']

const fieldClass =
  'rounded-control border border-border bg-surface-2/60 px-3 py-2.5 text-sm text-text outline-none transition-all duration-200 ease-out focus:border-accent focus-visible:ring-2 focus-visible:ring-accent'

// Modal de alta rápida del Calendario — click en un día vacío. Reusa
// PostForm/AddPieceForm en vez de duplicar los campos: la única pieza
// nueva acá es la elección Suelta/De campaña + el selector de campaña.
export function QuickAddModal({
  date,
  campaigns,
  instagramConnected,
  tiktokConnected,
  onClose,
}: {
  date: string
  campaigns: Campaign[]
  instagramConnected: boolean
  tiktokConnected: boolean
  onClose: () => void
}) {
  const [mode, setMode] = useState<'suelta' | 'campana'>('suelta')
  const [campaignId, setCampaignId] = useState<string>(campaigns[0]?.id ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-[480px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold tabular-nums text-text">Nueva publicación — {date}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-control text-text-3 transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-3 flex gap-1 rounded-control border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setMode('suelta')}
            className={`flex-1 rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
              mode === 'suelta' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
            }`}
          >
            Publicación suelta
          </button>
          <button
            type="button"
            onClick={() => setMode('campana')}
            disabled={campaigns.length === 0}
            className={`flex-1 rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${
              mode === 'campana' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
            }`}
          >
            Pieza de campaña
          </button>
        </div>

        {mode === 'suelta' && (
          <PostForm instagramConnected={instagramConnected} tiktokConnected={tiktokConnected} defaultDate={date} onDone={onClose} />
        )}

        {mode === 'campana' &&
          (campaigns.length === 0 ? (
            <p className="rounded-card border border-border bg-surface p-4 text-xs text-text-2">Todavía no tenés campañas creadas.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">
                Campaña
                <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={`normal-case tracking-normal ${fieldClass}`}>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <AddPieceForm
                key={campaignId}
                campaignId={campaignId}
                instagramConnected={instagramConnected}
                tiktokConnected={tiktokConnected}
                startOpen
                defaultDate={date}
                onDone={onClose}
              />
            </div>
          ))}
      </div>
    </div>
  )
}
