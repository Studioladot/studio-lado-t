'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PostForm } from './post-form'
import { deletePostAction } from './actions'
import { unifyContentItems, type UnifiedItem } from './unified-items'
import { StatusEditBadge } from './status-edit-badge'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { DropdownMenu, DropdownItem, FilterTrigger } from '@/components/features/dropdown-menu'
import { pillClass } from '@/components/features/action-pill'
import { Pagination } from '../meta-ads/campaigns/pagination'
import type { Database } from '@/lib/types/database.types'
import type { ContentPillar } from '@/lib/content/pillars'

const PAGE_SIZE = 15

type Post = Database['public']['Tables']['content_posts']['Row']
type Piece = Database['public']['Tables']['content_piezas']['Row']
type Campaign = Database['public']['Tables']['content_campaigns']['Row']

// Reemplaza publications-grid.tsx (2026-07-31) — la PO rechazó las tarjetas
// de h-[140px] por "difícil de escanear, tarjetas gigantes". Mismo patrón
// de tabla densa que ya usa Ventas (ledger-table.tsx): thead bg-surface-2,
// headers uppercase 10px, filas text-xs, paginado con el componente
// genérico ya usado en Campañas.
//
// Pulido UX/UI (2026-08-06): las 7 pastillas de filtro sueltas ("choclo
// visual") se agrupan en 2 dropdowns — Estado y Plataforma/Formato — que
// ahora se combinan con AND (antes un filtro pisaba al otro porque todo
// vivía en un único estado `filter`).

const STATUS_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'publicado', label: 'Publicadas' },
  { value: 'pendiente', label: 'Pendientes' },
] as const

const PLATFORM_FORMAT_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Reel', label: 'Reels' },
  { value: 'Carrusel', label: 'Carruseles' },
] as const

export function PublicationsTable({
  posts,
  pieces,
  campaigns,
  pillars,
  instagramConnected,
  tiktokConnected,
}: {
  posts: Post[]
  pieces: Piece[]
  campaigns: Campaign[]
  pillars: ContentPillar[]
  instagramConnected: boolean
  tiktokConnected: boolean
}) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [platformFormatFilter, setPlatformFormatFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [editingItem, setEditingItem] = useState<UnifiedItem | null>(null)

  const items = useMemo(() => unifyContentItems(posts, pieces, campaigns), [posts, pieces, campaigns])

  const filtered = useMemo(() => {
    const base = items.filter((i) => {
      const matchesStatus = statusFilter === 'all' || i.status === statusFilter
      const matchesPlatformFormat =
        platformFormatFilter === 'all' || i.platform === platformFormatFilter || i.format === platformFormatFilter
      return matchesStatus && matchesPlatformFormat
    })
    return [...base].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  }, [items, statusFilter, platformFormatFilter])

  // Auditoría de cierre (2026-08-01): antes esto renderizaba `filtered`
  // completo sin paginar — funcionaba para pocas filas, pero una
  // organización con meses de historial iba a terminar con una tabla de
  // cientos de filas sin ningún corte. Mismo componente de paginación ya
  // usado en Campañas, sin lógica nueva que mantener en dos lugares.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value)
    setPage(1)
  }

  function handlePlatformFormatFilterChange(value: string) {
    setPlatformFormatFilter(value)
    setPage(1)
  }

  const editingPost = editingItem?.sourceTable === 'content_posts' ? posts.find((p) => p.id === editingItem.id) : undefined

  const statusFilterLabel = STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? 'Todas'
  const platformFormatFilterLabel = PLATFORM_FORMAT_FILTERS.find((f) => f.value === platformFormatFilter)?.label ?? 'Todas'

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <DropdownMenu
            trigger={({ open, toggle }) => (
              <FilterTrigger label="Estado" value={statusFilterLabel} open={open} onClick={toggle} active={statusFilter !== 'all'} />
            )}
          >
            {(close) => (
              <>
                {STATUS_FILTERS.map((f) => (
                  <DropdownItem
                    key={f.value}
                    active={f.value === statusFilter}
                    onClick={() => {
                      handleStatusFilterChange(f.value)
                      close()
                    }}
                  >
                    {f.label}
                  </DropdownItem>
                ))}
              </>
            )}
          </DropdownMenu>

          <DropdownMenu
            trigger={({ open, toggle }) => (
              <FilterTrigger
                label="Plataforma / Formato"
                value={platformFormatFilterLabel}
                open={open}
                onClick={toggle}
                active={platformFormatFilter !== 'all'}
              />
            )}
          >
            {(close) => (
              <>
                {PLATFORM_FORMAT_FILTERS.map((f) => (
                  <DropdownItem
                    key={f.value}
                    active={f.value === platformFormatFilter}
                    onClick={() => {
                      handlePlatformFormatFilterChange(f.value)
                      close()
                    }}
                  >
                    {f.label}
                  </DropdownItem>
                ))}
              </>
            )}
          </DropdownMenu>
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
          <PostForm pillars={pillars} instagramConnected={instagramConnected} tiktokConnected={tiktokConnected} onDone={() => setCreating(false)} />
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
                  <td className="max-w-[260px] px-3 py-2">
                    <p className="truncate text-xs font-semibold text-text">{item.titulo || 'Sin título'}</p>
                    {item.source === 'campana' && (
                      <span className="text-[10px]" style={{ color: item.campaignColor }}>
                        {item.campaignName}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusEditBadge item={item} />
                  </td>
                  <td className="px-3 py-2 tabular-nums text-text-2">{item.date ?? '—'}</td>
                  <td className="px-3 py-2 text-text-2">{item.platform ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      {item.source === 'campana' ? (
                        <Link href={`/campaigns/${item.campaignId}`} className={pillClass('neutral')}>
                          Ver campaña
                        </Link>
                      ) : (
                        <>
                          <button type="button" onClick={() => setEditingItem(item)} className={pillClass('neutral')}>
                            Editar
                          </button>
                          <form action={deletePostAction.bind(null, item.id)}>
                            <ConfirmSubmitButton
                              confirmMessage={`¿Estás seguro? Se va a borrar "${item.titulo}".`}
                              toastPending="Borrando…"
                              toastSuccess="Eliminado con éxito"
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
            <PostForm
              post={editingPost}
              pillars={pillars}
              instagramConnected={instagramConnected}
              tiktokConnected={tiktokConnected}
              onDone={() => setEditingItem(null)}
            />
          </div>
        </div>
      )}
    </>
  )
}
