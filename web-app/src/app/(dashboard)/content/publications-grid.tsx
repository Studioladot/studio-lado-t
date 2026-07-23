'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PostForm } from './post-form'
import { deletePostAction, togglePostStatusAction } from './actions'
import { unifyContentItems, type UnifiedItem } from './unified-items'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import type { Database } from '@/lib/types/database.types'

type Post = Database['public']['Tables']['content_posts']['Row']
type Piece = Database['public']['Tables']['content_piezas']['Row']
type Campaign = Database['public']['Tables']['content_campaigns']['Row']

const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'publicado', label: 'Publicadas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Reel', label: 'Reels' },
  { value: 'Carrusel', label: 'Carruseles' },
] as const

const STATUS_BADGE: Record<string, string> = {
  publicado: 'border-green/40 bg-green/[8%] text-green',
  pendiente: 'border-amber/40 bg-amber/[8%] text-amber',
  borrador: 'border-border text-text-2',
}

export function PublicationsGrid({
  posts,
  pieces,
  campaigns,
}: {
  posts: Post[]
  pieces: Piece[]
  campaigns: Campaign[]
}) {
  const [filter, setFilter] = useState<string>('all')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ item: UnifiedItem; index: number } | null>(null)

  const items = useMemo(() => unifyContentItems(posts, pieces, campaigns), [posts, pieces, campaigns])

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((i) => i.status === filter || i.platform === filter || i.format === filter)
  }, [items, filter])

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
            + Publicación
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-4">
          <PostForm onDone={() => setCreating(false)} />
        </div>
      )}

      {filtered.length === 0 && !creating ? (
        <div className="rounded-card border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-text">Sin publicaciones</p>
          <p className="mt-1 text-xs text-text-2">Cargá una publicación suelta o desde una campaña.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            if (item.source === 'manual' && editingId === item.id) {
              const post = posts.find((p) => p.id === item.id)
              if (!post) return null
              return (
                <div key={item.id} className="sm:col-span-2 lg:col-span-3">
                  <PostForm post={post} onDone={() => setEditingId(null)} />
                </div>
              )
            }

            const thumb = item.mediaList[0] ?? (item.mediaUrl ? { url: item.mediaUrl, type: item.mediaType as 'image' | 'video' } : null)

            return (
              <div key={item.id} className="flex flex-col overflow-hidden rounded-card border border-border bg-surface">
                {thumb && (
                  <button
                    type="button"
                    onClick={() => setLightbox({ item, index: 0 })}
                    className="block h-[140px] w-full overflow-hidden bg-surface-2"
                  >
                    {thumb.type === 'video' ? (
                      <video src={thumb.url} className="h-full w-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb.url} alt="" className="h-full w-full object-cover" />
                    )}
                  </button>
                )}

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {item.platform && (
                        <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-text-2">
                          {item.platform}
                        </span>
                      )}
                      {item.format && (
                        <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-text-2">
                          {item.format}
                        </span>
                      )}
                      {item.source === 'campana' && (
                        <span
                          className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                          style={{ borderColor: item.campaignColor, color: item.campaignColor }}
                        >
                          {item.campaignName}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-text-3">{item.date ?? ''}</span>
                  </div>

                  <p className="line-clamp-3 flex-1 whitespace-pre-wrap text-sm text-text">
                    {item.caption || 'Sin texto'}
                  </p>

                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-medium capitalize ${STATUS_BADGE[item.status] ?? 'border-border text-text-2'}`}
                    >
                      {item.status}
                    </span>
                    <div className="flex items-center gap-3">
                      {item.source === 'campana' ? (
                        <Link
                          href={`/campaigns/${item.campaignId}`}
                          className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
                        >
                          Ver campaña
                        </Link>
                      ) : (
                        <>
                          <form
                            action={togglePostStatusAction.bind(
                              null,
                              item.id,
                              item.status === 'publicado' ? 'pendiente' : 'publicado'
                            )}
                          >
                            <button
                              type="submit"
                              className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
                            >
                              Cambiar estado
                            </button>
                          </form>
                          <button
                            type="button"
                            onClick={() => setEditingId(item.id)}
                            className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
                          >
                            Editar
                          </button>
                          <form action={deletePostAction.bind(null, item.id)}>
                            <ConfirmSubmitButton
                              confirmMessage={`¿Borrar la publicación "${item.titulo}"?`}
                              className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                            >
                              Borrar
                            </ConfirmSubmitButton>
                          </form>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {lightbox && lightbox.item.mediaList[lightbox.index] && (
        <MediaLightbox
          media={lightbox.item.mediaList}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onPrev={() =>
            setLightbox((l) =>
              l ? { ...l, index: (l.index - 1 + l.item.mediaList.length) % l.item.mediaList.length } : l
            )
          }
          onNext={() => setLightbox((l) => (l ? { ...l, index: (l.index + 1) % l.item.mediaList.length } : l))}
        />
      )}
    </>
  )
}

function MediaLightbox({
  media,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  media: { url: string; type: 'image' | 'video' }[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const item = media[index]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 ease-out hover:bg-white/20"
      >
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M4 4l10 10M14 4L4 14" />
        </svg>
      </button>

      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onPrev()
            }}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 ease-out hover:bg-white/20"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 3l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
            aria-label="Siguiente"
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 ease-out hover:bg-white/20"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 3l6 6-6 6" />
            </svg>
          </button>
        </>
      )}

      <div className="flex max-h-[85vh] max-w-[90vw] flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        {item.type === 'video' ? (
          <video src={item.url} controls autoPlay className="max-h-[80vh] max-w-[90vw] rounded-control" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="" className="max-h-[80vh] max-w-[90vw] rounded-control object-contain" />
        )}
      </div>
    </div>
  )
}
