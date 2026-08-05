'use client'

import { useMemo, useState } from 'react'
import { DropdownMenu, DropdownItem, FilterTrigger } from '@/components/features/dropdown-menu'
import type { LaunchActivityEntry, LaunchLogStatus } from '@/lib/meta/history'

const FILTERS: { value: 'all' | LaunchLogStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'completed', label: 'Completado' },
  { value: 'completed_with_errors', label: 'Con errores' },
  { value: 'failed', label: 'Fallido' },
]

const STATUS_BADGE: Record<LaunchLogStatus, string> = {
  completed: 'border-green/40 bg-green/[8%] text-green',
  completed_with_errors: 'border-amber/40 bg-amber/[8%] text-amber',
  failed: 'border-red/40 bg-red/[8%] text-red',
}

const STATUS_LABEL: Record<LaunchLogStatus, string> = {
  completed: 'Completado',
  completed_with_errors: 'Con errores',
  failed: 'Fallido',
}

export function HistoryList({ entries }: { entries: LaunchActivityEntry[] }) {
  const [filter, setFilter] = useState<'all' | LaunchLogStatus>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => (filter === 'all' ? entries : entries.filter((e) => e.status === filter)), [entries, filter])

  return (
    <>
      <div className="mb-4">
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
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-text">Sin actividad</p>
          <p className="mt-1 text-xs text-text-2">Acá vas a ver el historial de tus lanzamientos.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((entry) => {
            const expanded = expandedId === entry.id
            return (
              <div key={entry.id} className="overflow-hidden rounded-card border border-border bg-surface">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : entry.id)}
                  disabled={entry.steps.length === 0}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:cursor-default"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{entry.campaignName}</p>
                    <p className="mt-0.5 text-[11px] text-text-3">{new Date(entry.createdAt).toLocaleString('es-AR')}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${STATUS_BADGE[entry.status]}`}>
                      {STATUS_LABEL[entry.status]}
                    </span>
                    {entry.steps.length > 0 && (
                      <svg
                        width="9"
                        height="9"
                        viewBox="0 0 10 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`shrink-0 text-text-3 transition-transform duration-200 ease-out ${expanded ? 'rotate-90' : ''}`}
                      >
                        <path d="M3.5 2.5l4 2.5-4 2.5" />
                      </svg>
                    )}
                  </div>
                </button>
                {expanded && entry.steps.length > 0 && (
                  <ul className="flex flex-col gap-1.5 border-t border-border px-4 py-3">
                    {entry.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${step.ok ? 'bg-green' : 'bg-red'}`} />
                        <span className="text-text-2">
                          {step.label}
                          {step.detail && <span className="text-text-3"> — {step.detail}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
