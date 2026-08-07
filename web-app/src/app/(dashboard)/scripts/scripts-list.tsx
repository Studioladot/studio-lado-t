'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConvertToAdModal } from './[id]/convert-to-ad-modal'
import { WinnerBadge } from './winner-badge'
import { STATUS_LABEL, STATUS_COLOR, ANGLES, STATUSES } from './constants'
import type { Database } from '@/lib/types/database.types'

type Script = Database['public']['Tables']['scripts']['Row']

// Buscador + filtros (2026-08-07) — antes no existía ninguno de los dos:
// la lista entera se renderizaba de punta a punta sin forma de encontrar
// un guion puntual. Filtro 100% en memoria (sin debounce: es un array ya
// en el cliente, no hay ningún fetch de por medio que debounciar — poner
// uno acá solo metería un delay artificial sin ahorrar ningún trabajo real).
export function ScriptsList({ scripts, winnerScriptIds }: { scripts: Script[]; winnerScriptIds: string[] }) {
  const [convertingScript, setConvertingScript] = useState<Script | null>(null)
  const [query, setQuery] = useState('')
  const [angleFilter, setAngleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const router = useRouter()
  const winnerSet = useMemo(() => new Set(winnerScriptIds), [winnerScriptIds])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return scripts.filter((s) => {
      const matchesQuery =
        !needle || (s.title ?? '').toLowerCase().includes(needle) || (s.hook ?? '').toLowerCase().includes(needle)
      const matchesAngle = !angleFilter || s.angle === angleFilter
      const matchesStatus = !statusFilter || s.status === statusFilter
      return matchesQuery && matchesAngle && matchesStatus
    })
  }, [scripts, query, angleFilter, statusFilter])

  const hasActiveFilters = query.trim() !== '' || angleFilter !== '' || statusFilter !== ''

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título o hook…"
          className="w-60 rounded-control border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-all duration-200 ease-out placeholder:text-text-3 focus:border-accent"
        />
        <select
          value={angleFilter}
          onChange={(e) => setAngleFilter(e.target.value)}
          className="rounded-control border border-border bg-surface px-2.5 py-2 text-xs text-text-2 outline-none transition-colors duration-150 ease-out focus:border-accent"
        >
          <option value="">Todos los ángulos</option>
          {ANGLES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-control border border-border bg-surface px-2.5 py-2 text-xs text-text-2 outline-none transition-colors duration-150 ease-out focus:border-accent"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setAngleFilter('')
              setStatusFilter('')
            }}
            className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-text"
          >
            Limpiar
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-border bg-surface px-6 py-10 text-center text-sm text-text-2">
          Ningún guion coincide con el filtro.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((script) => (
            <div
              key={script.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface px-5 py-4 transition-all duration-200 ease-out hover:border-border-2"
            >
              <Link href={`/scripts/${script.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-text">{script.title || 'Sin título'}</p>
                  {winnerSet.has(script.id) && <WinnerBadge compact />}
                </div>
                <p className="mt-0.5 text-xs text-text-2">{script.angle || '—'}</p>
              </Link>
              <div className="flex shrink-0 items-center gap-2.5">
                <span
                  className={`rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    STATUS_COLOR[script.status ?? ''] ?? 'text-text-2'
                  }`}
                >
                  {STATUS_LABEL[script.status ?? ''] ?? script.status}
                </span>
                <button
                  type="button"
                  onClick={() => setConvertingScript(script)}
                  className="rounded-control border border-accent/30 bg-accent/[0.06] px-2.5 py-1 text-[11px] font-semibold text-accent transition-all duration-200 ease-out hover:bg-accent/[0.12]"
                >
                  Convertir a Anuncio
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {convertingScript && (
        <ConvertToAdModal
          open
          onClose={() => setConvertingScript(null)}
          scriptId={convertingScript.id}
          defaultName={convertingScript.title ?? 'Sin título'}
          defaultHeadline={convertingScript.hook ?? ''}
          defaultPrimaryText={convertingScript.copy_feed || convertingScript.body || ''}
          onDone={() => {
            setConvertingScript(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
