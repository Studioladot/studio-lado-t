'use client'

import { useMemo, useState } from 'react'
import { CreativeForm } from './creative-form'
import { EditCreativeModal } from './edit-creative-modal'
import { setLibraryCreativeStatusAction, deleteLibraryCreativeAction } from './actions'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { DropdownMenu, DropdownItem, FilterTrigger } from '@/components/features/dropdown-menu'
import { CREATIVE_STATUS_LABEL, CREATIVE_STATUS_BADGE_CLASS, type LibraryCreative, type CreativeStatus } from '@/lib/meta/library'

const FILTERS: { value: 'all' | CreativeStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Disponible' },
  { value: 'in_use', label: 'En uso' },
  { value: 'paused', label: 'Pausado' },
]

export function LibraryGrid({ creatives }: { creatives: LibraryCreative[] }) {
  const [filter, setFilter] = useState<'all' | CreativeStatus>('all')
  const [creating, setCreating] = useState(false)
  const [editingCreative, setEditingCreative] = useState<LibraryCreative | null>(null)

  const filtered = useMemo(
    () => (filter === 'all' ? creatives : creatives.filter((c) => c.status === filter)),
    [creatives, filter]
  )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <DropdownMenu
          trigger={({ open, toggle }) => (
            <FilterTrigger
              label="Estado"
              value={FILTERS.find((f) => f.value === filter)?.label ?? 'Todos'}
              open={open}
              onClick={toggle}
              active={filter !== 'all'}
            />
          )}
        >
          {(close) => (
            <>
              {FILTERS.map((f) => (
                <DropdownItem
                  key={f.value}
                  active={f.value === filter}
                  onClick={() => {
                    setFilter(f.value)
                    close()
                  }}
                >
                  {f.label}
                </DropdownItem>
              ))}
            </>
          )}
        </DropdownMenu>

        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-control bg-primary px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
          >
            + Subir Creativo
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-4">
          <CreativeForm onDone={() => setCreating(false)} />
        </div>
      )}

      {filtered.length === 0 && !creating ? (
        <div className="rounded-card border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-text">Sin creativos</p>
          <p className="mt-1 text-xs text-text-2">Subí el primero para que el Autopiloto tenga de dónde rotar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((creative) => (
            <div key={creative.id} className="flex flex-col overflow-hidden rounded-card border border-border bg-surface">
              <div className="h-[140px] w-full overflow-hidden bg-surface-2">
                {creative.assetType === 'video' ? (
                  <video src={creative.fileUrl} preload="metadata" className="h-full w-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={creative.fileUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-text" title={creative.name}>
                    {creative.name}
                  </p>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${CREATIVE_STATUS_BADGE_CLASS[creative.status]}`}
                  >
                    {CREATIVE_STATUS_LABEL[creative.status]}
                  </span>
                </div>

                {creative.headline && <p className="text-xs font-medium text-text-2">{creative.headline}</p>}
                {creative.primaryText && <p className="line-clamp-2 text-xs text-text-3">{creative.primaryText}</p>}
                {creative.sourceScriptTitle && (
                  <p className="truncate text-[10px] text-text-3" title={creative.sourceScriptTitle}>
                    Desde guion: {creative.sourceScriptTitle}
                  </p>
                )}

                {creative.status === 'in_use' && creative.deployedAt && (
                  <p className="text-[10px] text-text-3">
                    En uso desde {new Date(creative.deployedAt).toLocaleDateString('es-AR')}
                    {creative.deployedAdId ? ` — anuncio ${creative.deployedAdId}` : ''}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingCreative(creative)}
                      className="text-[11px] font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
                    >
                      Editar
                    </button>
                    {creative.status !== 'active' && (
                      <form action={setLibraryCreativeStatusAction.bind(null, creative.id, 'active')}>
                        <button
                          type="submit"
                          className="text-[11px] font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
                        >
                          Marcar disponible
                        </button>
                      </form>
                    )}
                    {creative.status !== 'paused' && (
                      <form action={setLibraryCreativeStatusAction.bind(null, creative.id, 'paused')}>
                        <button
                          type="submit"
                          className="text-[11px] font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
                        >
                          Pausar
                        </button>
                      </form>
                    )}
                  </div>
                  <form action={deleteLibraryCreativeAction.bind(null, creative.id)}>
                    <ConfirmSubmitButton
                      confirmMessage={`¿Borrar "${creative.name}"?`}
                      className="text-[11px] font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                    >
                      Borrar
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <EditCreativeModal creative={editingCreative} onClose={() => setEditingCreative(null)} onDone={() => setEditingCreative(null)} />
    </>
  )
}
