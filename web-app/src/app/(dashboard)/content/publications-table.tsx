'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PostForm } from './post-form'
import { deletePostAction, togglePostStatusAction } from './actions'
import { unifyContentItems, type UnifiedItem } from './unified-items'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { Pagination } from '../meta-ads/campaigns/pagination'
import type { Database } from '@/lib/types/database.types'

const PAGE_SIZE = 15

type Post = Database['public']['Tables']['content_posts']['Row']
type Piece = Database['public']['Tables']['content_piezas']['Row']
type Campaign = Database['public']['Tables']['content_campaigns']['Row']

// Reemplaza publications-grid.tsx (2026-07-31) — la PO rechazó las tarjetas
// de h-[140px] por "difícil de escanear, tarjetas gigantes". Mismo patrón
// de tabla densa que ya usa Ventas (ledger-table.tsx): thead bg-surface-2,
// headers uppercase 10px, filas text-xs, paginado con el componente
// genérico ya usado en Campañas.

const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'publicado', label: 'Publicadas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Reel', label: 'Reels' },
  { value: 'Carrusel', label: 'Carruseles' },
] as const

const MANUAL_STATUS_BADGE: Record<string, string> = {
  publicado: 'border-green/40 bg-green/[8%] text-green',
  pendiente: 'border-amber/40 bg-amber/[8%] text-amber',
  borrador: 'border-border text-text-2',
}

function StatusBadge({ item }: { item: UnifiedItem }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${MANUAL_STATUS_BADGE[item.status] ?? 'border-border text-text-2'}`}>
      {item.status}
    </span>
  )
}

function Thumb({ item }: { item: UnifiedItem }) {
  const thumb = item.mediaList[0] ?? null
  if (!thumb) {
    return <div className="h-8 w-8 shrink-0 rounded-control border border-border bg-surface-2" />
  }
  return (
    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-control border border-border bg-surface-2">
      {thumb.type === 'video' ? (
        <video src={thumb.url} className="h-full w-full object-cover" muted />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb.url} alt="" className="h-full w-full object-cover" />
      )}
    </div>
  )
}

export function PublicationsTable({
  posts,
  pieces,
  campaigns,
  instagramConnected,
  tiktokConnected,
}: {
  posts: Post[]
  pieces: Piece[]
  campaigns: Campaign[]
  instagramConnected: boolean
  tiktokConnected: boolean
}) {
  const [filter, setFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [editingItem, setEditingItem] = useState<UnifiedItem | null>(null)

  const items = useMemo(() => unifyContentItems(posts, pieces, campaigns), [posts, pieces, campaigns])

  const filtered = useMemo(() => {
    const base = filter === 'all' ? items : items.filter((i) => i.status === filter || i.platform === filter || i.format === filter)
    return [...base].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  }, [items, filter])

  // Auditoría de cierre (2026-08-01): antes esto renderizaba `filtered`
  // completo sin paginar — funcionaba para pocas filas, pero una
  // organización con meses de historial iba a terminar con una tabla de
  // cientos de filas sin ningún corte. Mismo componente de paginación ya
  // usado en Campañas, sin lógica nueva que mantener en dos lugares.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleFilterChange(value: string) {
    setFilter(value)
    setPage(1)
  }

  const editingPost = editingItem?.sourceTable === 'content_posts' ? posts.find((p) => p.id === editingItem.id) : undefined

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => handleFilterChange(f.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out ${
                filter === f.value ? 'border-accent bg-accent/15 text-accent' : 'border-border text-text-2 hover:bg-surface-2'
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
          <PostForm instagramConnected={instagramConnected} tiktokConnected={tiktokConnected} onDone={() => setCreating(false)} />
        </div>
      )}

      {filtered.length === 0 && !creating ? (
        <div className="rounded-card border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-text">Sin publicaciones</p>
          <p className="mt-1 text-xs text-text-2">Cargá una publicación suelta o desde una campaña.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-control border border-border">
          <table className="w-full text-xs">
            <thead className="bg-surface-2">
              <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-text-3">
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Red social</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((item) => (
                <tr key={`${item.sourceTable}-${item.id}`} className="border-t border-divider transition-colors duration-150 ease-out hover:bg-surface-2/40">
                  <td className="px-3 py-2">
                    <Thumb item={item} />
                  </td>
                  <td className="max-w-[260px] px-3 py-2">
                    <p className="truncate text-xs font-semibold text-text">{item.titulo || 'Sin título'}</p>
                    {item.source === 'campana' && (
                      <span className="text-[10px]" style={{ color: item.campaignColor }}>
                        {item.campaignName}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge item={item} />
                  </td>
                  <td className="px-3 py-2 tabular-nums text-text-2">{item.date ?? '—'}</td>
                  <td className="px-3 py-2 text-text-2">{item.platform ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-3">
                      {item.source === 'campana' ? (
                        <Link href={`/campaigns/${item.campaignId}`} className="font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text">
                          Ver campaña
                        </Link>
                      ) : (
                        <>
                          <form action={togglePostStatusAction.bind(null, item.id, item.status === 'publicado' ? 'pendiente' : 'publicado')}>
                            <button type="submit" className="font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text">
                              {item.status === 'publicado' ? 'Marcar pendiente' : 'Marcar publicado'}
                            </button>
                          </form>
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
                          >
                            Editar
                          </button>
                          <form action={deletePostAction.bind(null, item.id)}>
                            <ConfirmSubmitButton
                              confirmMessage={`¿Estás seguro? Se va a borrar "${item.titulo}".`}
                              className="font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                            >
                              Borrar
                            </ConfirmSubmitButton>
                          </form>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {editingItem && editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditingItem(null)}>
          <div className="max-h-[85vh] w-full max-w-[480px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <PostForm post={editingPost} instagramConnected={instagramConnected} tiktokConnected={tiktokConnected} onDone={() => setEditingItem(null)} />
          </div>
        </div>
      )}
    </>
  )
}
