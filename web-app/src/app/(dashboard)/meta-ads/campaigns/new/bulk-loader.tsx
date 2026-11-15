'use client'

import { useRef, useState } from 'react'
import type { AdPrefill } from './ad-editor'
import { fieldClass, labelClass } from './wizard-styles'
import { TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'

// Carga rápida (2026-11-15): soltás todos los videos/imágenes juntos, elegís
// cuántos anuncios va por conjunto y el texto común, y se arman los conjuntos
// con cada anuncio ya precargado (los archivos empiezan a subir solos, de a
// 3 a la vez). Después cada anuncio se puede retocar como siempre.

export type BulkGroup = { name: string; ads: AdPrefill[] }

const PER_SET_OPTIONS = [1, 2, 3, 4, 5, 6]

function baseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
}

export function BulkLoader({ productUrl, onApply }: { productUrl: string; onApply: (groups: BulkGroup[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [perSet, setPerSet] = useState(3)
  const [setPrefix, setSetPrefix] = useState('Conjunto')
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')

  function addFiles(list: FileList | null) {
    const picked = Array.from(list ?? []).filter((f) => f.type.startsWith('video/') || f.type.startsWith('image/'))
    if (picked.length === 0) return
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}-${f.size}`))
      const merged = [...prev, ...picked.filter((f) => !seen.has(`${f.name}-${f.size}`))]
      // Orden por nombre (con números naturales): "A1, A2, A10" — así los
      // archivos que se llaman parecido caen en el mismo conjunto.
      return merged.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }))
    })
  }

  const setCount = files.length ? Math.ceil(files.length / perSet) : 0

  function apply() {
    const groups: BulkGroup[] = []
    for (let i = 0; i < files.length; i += perSet) {
      const chunk = files.slice(i, i + perSet)
      groups.push({
        name: `${setPrefix.trim() || 'Conjunto'} ${groups.length + 1}`,
        ads: chunk.map((file) => ({
          file,
          name: baseName(file.name),
          headline: headline.trim() || undefined,
          body: body.trim() || undefined,
          link: link.trim() || undefined,
        })),
      })
    }
    onApply(groups)
    setFiles([])
  }

  return (
    <div className="rounded-card border border-accent/30 bg-accent/[0.04] p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-text">Carga rápida</p>
        <p className="text-xs text-text-2">
          Soltá todos los videos o imágenes juntos. Gotix arma los conjuntos, les pone el mismo texto y los sube a Meta mientras seguís.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-control border border-dashed px-4 py-5 text-center outline-none transition-colors duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent ${
          dragOver ? 'border-accent bg-accent/[0.08]' : 'border-border-2 bg-surface hover:border-accent/50'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-text-3">
          <path d="M12 3v12M12 3l-4 4M12 3l4 4" />
          <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
        <p className="text-[13px] text-text">
          {files.length > 0 ? (
            <span className="font-semibold">
              {files.length} archivo{files.length === 1 ? '' : 's'} — sumá más o armá los conjuntos
            </span>
          ) : (
            <>
              <span className="font-semibold text-accent">Elegí</span> o arrastrá varios archivos a la vez
            </>
          )}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="video/*,image/*"
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          <ul className="flex max-h-28 flex-col gap-1 overflow-y-auto">
            {files.map((f, i) => (
              <li key={`${f.name}-${f.size}`} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-text-2">
                  <span className="text-text-3">{Math.floor(i / perSet) + 1}.</span> {f.name}
                </span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
                  className="shrink-0 text-text-3 transition-colors duration-200 ease-out hover:text-red"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="bulk_per_set">
                Anuncios por conjunto
              </label>
              <select id="bulk_per_set" value={perSet} onChange={(e) => setPerSet(Number(e.target.value))} className={fieldClass}>
                {PER_SET_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'anuncio' : 'anuncios'}
                  </option>
                ))}
                <option value={files.length || 1}>Todos en un solo conjunto</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="bulk_prefix">
                Nombre de los conjuntos
              </label>
              <input id="bulk_prefix" value={setPrefix} onChange={(e) => setSetPrefix(e.target.value)} maxLength={TITLE_MAX_LENGTH} className={fieldClass} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="bulk_body">
              Texto principal (para todos)
            </label>
            <textarea id="bulk_body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={TEXT_MAX_LENGTH} className={fieldClass} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="bulk_headline">
                Título (para todos)
              </label>
              <input id="bulk_headline" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={TITLE_MAX_LENGTH} className={fieldClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="bulk_link">
                Link de destino
              </label>
              <input
                id="bulk_link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={productUrl || 'El link del producto del paso 1'}
                className={fieldClass}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={apply}
            className="self-start rounded-control bg-primary px-4 py-2 text-xs font-bold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
          >
            Armar {setCount} conjunto{setCount === 1 ? '' : 's'} con {files.length} anuncio{files.length === 1 ? '' : 's'}
          </button>
          <p className="-mt-1 text-[11px] text-text-3">Reemplaza los conjuntos de abajo. Cada anuncio se puede retocar después.</p>
        </div>
      )}
    </div>
  )
}
