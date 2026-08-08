'use client'

import { useMemo, useState } from 'react'
import { NoteForm } from './note-form'
import { deleteNoteAction } from './actions'
import { NOTE_CATEGORIES, NOTE_CATEGORY_LABEL, NOTE_COLOR_ACCENT } from './note-constants'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { ExpandableText } from '@/components/features/expandable-text'
import { PillarBadge } from '@/components/features/pillar-badge'
import type { Database } from '@/lib/types/database.types'
import type { ContentPillar } from '@/lib/pillars'

type Note = Database['public']['Tables']['notes']['Row']

const FILTERS: Array<{ value: string; label: string }> = [{ value: 'all', label: 'Todas' }, ...NOTE_CATEGORIES]

export function NotesGrid({ notes, campaignId, pillars }: { notes: Note[]; campaignId?: string; pillars: ContentPillar[] }) {
  const [filter, setFilter] = useState('all')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const filtered = useMemo(
    () => (filter === 'all' ? notes : notes.filter((n) => (n.categoria ?? 'varios') === filter)),
    [notes, filter]
  )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out ${
                filter === f.value
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border text-text-2 hover:bg-surface-2'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-control bg-primary px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
          >
            + Nueva nota
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-4">
          <NoteForm campaignId={campaignId} pillars={pillars} onDone={() => setCreating(false)} />
        </div>
      )}

      {filtered.length === 0 && !creating ? (
        <div className="rounded-card border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-text">Sin notas todavía</p>
          <p className="mt-1 text-xs text-text-2">Escribí lo que se te ocurra, sin estructura.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => {
            if (editingId === note.id) {
              return (
                <div key={note.id} className="sm:col-span-2 lg:col-span-3">
                  <NoteForm note={note} pillars={pillars} onDone={() => setEditingId(null)} />
                </div>
              )
            }

            const accent = NOTE_COLOR_ACCENT[note.color ?? ''] ?? '#c8c6c0'
            const fecha = note.created_at
              ? new Date(note.created_at).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''

            return (
              <div
                key={note.id}
                className="flex min-h-[130px] flex-col gap-2 rounded-card border border-border bg-surface p-4"
                style={{ borderTopWidth: '3px', borderTopColor: accent }}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[.06em] text-text-3">
                    {NOTE_CATEGORY_LABEL[note.categoria ?? 'varios'] ?? 'Varios'}
                  </span>
                  {note.pilar && <PillarBadge pillar={note.pilar} />}
                </div>

                {note.media_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={note.media_url}
                    alt=""
                    onClick={() => setLightboxUrl(note.media_url)}
                    className="h-24 w-full cursor-pointer rounded-control object-cover"
                  />
                )}

                {note.titulo && <p className="text-sm font-semibold text-text">{note.titulo}</p>}

                <div className="flex-1 text-sm text-text-2">
                  <ExpandableText text={note.contenido} lines={3} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-3">{fecha}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingId(note.id)}
                      className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
                    >
                      Editar
                    </button>
                    <form action={deleteNoteAction.bind(null, note.id, note.campaign_id)}>
                      <ConfirmSubmitButton
                        confirmMessage="¿Borrar esta nota?"
                        className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                      >
                        Borrar
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[85vh] max-w-[90vw] rounded-control object-contain"
          />
        </div>
      )}
    </>
  )
}
