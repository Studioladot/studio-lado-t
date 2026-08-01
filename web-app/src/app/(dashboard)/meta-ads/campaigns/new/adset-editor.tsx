'use client'

import { useState } from 'react'
import { AdEditor } from './ad-editor'
import { AudienceSelector } from './audience-selector'
import { fieldClass } from './wizard-styles'
import type { MetaAudience, MetaExistingPost } from '@/lib/meta/ad-launch'
import type { LibraryCreative } from '@/lib/meta/library'

type ScriptOption = { id: string; title: string | null; hook: string | null; body: string | null; copy_feed: string | null }

export function AdSetEditor({
  index,
  setNumber,
  audiences,
  scripts,
  existingPosts,
  libraryCreatives,
  removable,
  onRemove,
}: {
  index: number
  setNumber: number
  audiences: MetaAudience[]
  scripts: ScriptOption[]
  existingPosts: MetaExistingPost[]
  libraryCreatives: LibraryCreative[]
  removable: boolean
  onRemove: () => void
}) {
  const [adIds, setAdIds] = useState<number[]>([0])
  const [nextAdId, setNextAdId] = useState(1)
  const [collapsed, setCollapsed] = useState(false)
  const [name, setName] = useState('')

  function addAd() {
    setAdIds((prev) => [...prev, nextAdId])
    setNextAdId((n) => n + 1)
  }

  function removeAd(id: number) {
    setAdIds((prev) => prev.filter((x) => x !== id))
  }

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <input type="hidden" name={`ad_count_${index}`} value={adIds.length} />

      {/* Header compacto: nombre + duplicados en la misma fila, colapsable — evita el
          bloque enorme "Nombre del conjunto" apilado que se comía media pantalla. */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 text-text-3 transition-transform duration-200 ease-out ${collapsed ? '-rotate-90' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-text-3">Conjunto {setNumber}</span>
            {collapsed && <span className="block truncate text-[13px] font-semibold text-text">{name || `Público ${setNumber}`}</span>}
          </span>
        </button>

        {!collapsed && (
          <input
            id={`adset_name_${index}`}
            name={`adset_name_${index}`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Ej: Público ${setNumber}`}
            className={fieldClass + ' w-[200px] shrink-0 py-1.5'}
          />
        )}
        {collapsed && <input type="hidden" name={`adset_name_${index}`} value={name} />}

        <div className="flex shrink-0 items-center gap-1.5">
          <label
            htmlFor={`adset_duplicates_${index}`}
            title="Copias idénticas de este conjunto para medir varianza — no dividen el presupuesto entre ellas."
            className="text-[11px] font-medium text-text-3"
          >
            Dup.
          </label>
          <input
            id={`adset_duplicates_${index}`}
            name={`adset_duplicates_${index}`}
            type="number"
            min={1}
            max={10}
            defaultValue={1}
            className={fieldClass + ' w-[56px] py-1.5 text-center'}
          />
        </div>

        {removable && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Quitar conjunto"
            className="shrink-0 text-text-3 transition-colors duration-200 ease-out hover:text-red"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
            </svg>
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="mt-4 flex flex-col gap-4">
          <AudienceSelector index={index} audiences={audiences} />

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            {adIds.map((adId, adIndex) => (
              <AdEditor
                key={adId}
                adSetIndex={index}
                adIndex={adIndex}
                adNumber={adIndex + 1}
                scripts={scripts}
                existingPosts={existingPosts}
                libraryCreatives={libraryCreatives}
                removable={adIds.length > 1}
                onRemove={() => removeAd(adId)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addAd}
            className="self-start text-xs font-semibold text-accent transition-colors duration-200 ease-out hover:text-primary-hover"
          >
            + Agregar otro anuncio a este conjunto
          </button>
        </div>
      )}
    </div>
  )
}
