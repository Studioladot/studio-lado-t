'use client'

import { useEffect, useRef, useState } from 'react'
import type { MetaExistingPost } from '@/lib/meta/ad-launch'
import type { LibraryCreative } from '@/lib/meta/library'
import type { InstagramPostOption } from './data-actions'
import { viewsOf, formatLabel } from '@/lib/instagram/media-catalog-winners'
import { fmtCompactCount } from '@/lib/format/number'
import { fieldClass, labelClass, toggleBase } from './wizard-styles'
import { FileDropzone } from './file-dropzone'
import { uploadCreative, type CreativeUploadEvent } from './upload-creative'
import { generateAdCopy, type AdCopyVariant } from './extract-media'
import { TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'

type ScriptOption = { id: string; title: string | null; hook: string | null; body: string | null; copy_feed: string | null }

/** Lo que precarga la Carga rápida: el archivo (empieza a subir solo) y el copy común. */
export type AdPrefill = { file?: File; name?: string; headline?: string; body?: string; link?: string; autoCopy?: boolean }

export function AdEditor({
  adSetIndex,
  adIndex,
  adNumber,
  scripts,
  existingPosts,
  libraryCreatives,
  instagramPosts,
  igActorId,
  removable,
  onRemove,
  prefill,
  productUrl,
}: {
  prefill?: AdPrefill
  productUrl?: string
  adSetIndex: number
  adIndex: number
  adNumber: number
  scripts: ScriptOption[]
  existingPosts: MetaExistingPost[]
  libraryCreatives: LibraryCreative[]
  instagramPosts: InstagramPostOption[]
  igActorId: string | null
  removable: boolean
  onRemove: () => void
}) {
  const [scriptId, setScriptId] = useState('')
  const [mode, setMode] = useState<'new' | 'existing' | 'library' | 'instagram_post'>('new')
  const [libraryAssetId, setLibraryAssetId] = useState<string | null>(null)
  const [igMediaId, setIgMediaId] = useState<string | null>(null)
  const canPublicizePost = igActorId && instagramPosts.length > 0
  const [mediaType, setMediaType] = useState<'image' | 'video'>(prefill?.file?.type.startsWith('video/') ? 'video' : 'image')
  const headlineRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  function selectLibraryAsset(asset: LibraryCreative) {
    setLibraryAssetId(asset.id)
    if (headlineRef.current) headlineRef.current.value = asset.headline ?? ''
    if (bodyRef.current) bodyRef.current.value = asset.primaryText ?? ''
  }

  // Imagen o video se suben apenas se eligen (2026-11-15): directo al
  // almacenamiento y de ahí a Meta (ver upload-creative.ts). Al lanzar, el
  // formulario solo lleva el código de Meta, no el archivo.
  const [upload, setUpload] = useState<CreativeUploadEvent | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [ready, setReady] = useState<{ videoId?: string; thumbnailUrl?: string | null; imageHash?: string } | null>(null)
  const lastFileRef = useRef<File | null>(null)

  function startUpload(file: File) {
    lastFileRef.current = file
    setFileName(file.name)
    setReady(null)
    void uploadCreative(file, (e) => {
      setUpload(e)
      if (e.phase === 'ready') setReady({ videoId: e.videoId, thumbnailUrl: e.thumbnailUrl, imageHash: e.imageHash })
    })
  }

  // Copy automático (2026-11-15): escucha y mira el video y escribe 3
  // opciones; la primera se carga sola, las otras quedan para elegir.
  const [copyState, setCopyState] = useState<{ status: 'idle' | 'working' | 'error'; error?: string }>({ status: 'idle' })
  const [variants, setVariants] = useState<AdCopyVariant[]>([])
  const [chosen, setChosen] = useState(0)

  function applyVariant(v: AdCopyVariant, i: number) {
    setChosen(i)
    if (headlineRef.current) headlineRef.current.value = v.titulo
    if (bodyRef.current) bodyRef.current.value = v.texto
  }

  async function writeCopy() {
    const file = lastFileRef.current
    if (!file) return
    setCopyState({ status: 'working' })
    const link = (document.getElementById(`ad_link_${adSetIndex}_${adIndex}`) as HTMLInputElement | null)?.value || productUrl || ''
    const result = await generateAdCopy(file, link)
    if (!result.ok) return setCopyState({ status: 'error', error: result.error })
    setVariants(result.variantes)
    applyVariant(result.variantes[0], 0)
    setCopyState({ status: 'idle' })
  }

  // Carga rápida: el archivo llega ya elegido y arranca a subir solo
  // (y, si se pidió, también se escribe el copy).
  const prefillStarted = useRef(false)
  useEffect(() => {
    if (prefill?.file && !prefillStarted.current) {
      prefillStarted.current = true
      startUpload(prefill.file)
      if (prefill.autoCopy && !prefill.body) void writeCopy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.file])

  function applyScript(id: string) {
    setScriptId(id)
    const script = scripts.find((s) => s.id === id)
    if (!script) return
    if (headlineRef.current) headlineRef.current.value = script.title ?? script.hook ?? ''
    if (bodyRef.current) bodyRef.current.value = script.copy_feed || script.body || script.hook || ''
  }

  const prefix = `${adSetIndex}_${adIndex}`

  return (
    <div className="rounded-control border border-border bg-surface-2/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-text-3">Anuncio {adNumber}</p>
        {removable && (
          <button type="button" onClick={onRemove} className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red">
            Quitar
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`ad_name_${prefix}`} className={labelClass}>
            Nombre del anuncio
          </label>
          <input id={`ad_name_${prefix}`} name={`ad_name_${prefix}`} type="text" maxLength={TITLE_MAX_LENGTH} placeholder="Opcional" defaultValue={prefill?.name} className={fieldClass} />
        </div>

        {(existingPosts.length > 0 || libraryCreatives.length > 0 || canPublicizePost) && (
          <div>
            <p className={`mb-1.5 ${labelClass}`}>Creativo</p>
            <div className="inline-flex flex-wrap rounded-control border border-border p-0.5">
              {canPublicizePost && (
                <button
                  type="button"
                  aria-pressed={mode === 'instagram_post'}
                  onClick={() => setMode('instagram_post')}
                  className={`${toggleBase} ${mode === 'instagram_post' ? 'bg-primary text-white' : 'text-text-2 hover:text-text'}`}
                >
                  Publicitar un posteo
                </button>
              )}
              <button
                type="button"
                aria-pressed={mode === 'new'}
                onClick={() => setMode('new')}
                className={`${toggleBase} ${mode === 'new' ? 'bg-primary text-white' : 'text-text-2 hover:text-text'}`}
              >
                Creativo nuevo
              </button>
              {existingPosts.length > 0 && (
                <button
                  type="button"
                  aria-pressed={mode === 'existing'}
                  onClick={() => setMode('existing')}
                  className={`${toggleBase} ${mode === 'existing' ? 'bg-primary text-white' : 'text-text-2 hover:text-text'}`}
                >
                  Reusar publicación existente
                </button>
              )}
              {libraryCreatives.length > 0 && (
                <button
                  type="button"
                  aria-pressed={mode === 'library'}
                  onClick={() => setMode('library')}
                  className={`${toggleBase} ${mode === 'library' ? 'bg-primary text-white' : 'text-text-2 hover:text-text'}`}
                >
                  Desde Biblioteca
                </button>
              )}
            </div>
            <input type="hidden" name={`ad_mode_${prefix}`} value={mode} />
            <input type="hidden" name={`ad_library_id_${prefix}`} value={libraryAssetId ?? ''} />
            <input type="hidden" name={`ad_ig_media_id_${prefix}`} value={igMediaId ?? ''} />
          </div>
        )}

        {mode === 'instagram_post' ? (
          <div className="flex flex-col gap-2">
            <p className={`mb-1.5 ${labelClass}`}>Elegí qué publicación anunciar</p>
            <div className="grid max-h-70 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {instagramPosts.map((post) => {
                const views = viewsOf(post)
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setIgMediaId(post.ig_media_id)}
                    className={`flex flex-col overflow-hidden rounded-control border text-left transition-colors duration-200 ease-out ${
                      igMediaId === post.ig_media_id ? 'border-accent ring-2 ring-accent' : 'border-border hover:border-accent/40'
                    }`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
                      {post.thumbnail_url || post.media_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- imagen remota de Instagram, no un asset local.
                        <img src={post.thumbnail_url ?? post.media_url ?? undefined} alt="" className="h-full w-full object-cover" />
                      ) : null}
                      {views !== null && (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white">
                          {fmtCompactCount(views)}
                        </span>
                      )}
                    </div>
                    <p className="truncate px-1 py-1 text-[9px] text-text-3" title={post.caption ?? undefined}>
                      {formatLabel(post)}
                    </p>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-text-3">
              El anuncio muestra esta publicación tal cual está en Instagram — likes, comentarios y el copy original se
              mantienen, no hay campos para editar acá.
            </p>
          </div>
        ) : mode === 'existing' ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`ad_existing_post_${prefix}`} className={labelClass}>
              Publicación a reusar
            </label>
            <select id={`ad_existing_post_${prefix}`} name={`ad_existing_post_${prefix}`} required className={fieldClass}>
              {existingPosts.map((post) => (
                <option key={post.id} value={post.objectStoryId}>
                  {post.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-3">
              El anuncio nuevo hereda los likes y comentarios de esa publicación en vez de arrancar de cero.
            </p>
          </div>
        ) : mode === 'library' ? (
          <div className="flex flex-col gap-3">
            <div>
              <p className={`mb-1.5 ${labelClass}`}>Elegí un creativo</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {libraryCreatives.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => selectLibraryAsset(asset)}
                    className={`flex flex-col overflow-hidden rounded-control border text-left transition-colors duration-200 ease-out ${
                      libraryAssetId === asset.id ? 'border-accent ring-2 ring-accent' : 'border-border hover:border-accent/40'
                    }`}
                  >
                    <div className="h-16 w-full overflow-hidden bg-surface-2">
                      {asset.assetType === 'video' ? (
                        <video src={asset.fileUrl} className="h-full w-full object-cover" muted />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.fileUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <p className="truncate px-1.5 py-1 text-[10px] font-medium text-text-2" title={asset.name}>
                      {asset.name}
                    </p>
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-text-3">Título y Copy se precargan del creativo — los podés editar antes de lanzar.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`ad_link_${prefix}`} className={labelClass}>
                Link de destino
              </label>
              <input
                id={`ad_link_${prefix}`}
                name={`ad_link_${prefix}`}
                type="url"
                placeholder="URL del producto si lo dejás vacío"
                className={fieldClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`ad_headline_${prefix}`} className={labelClass}>
                Título
              </label>
              <input id={`ad_headline_${prefix}`} name={`ad_headline_${prefix}`} type="text" maxLength={TITLE_MAX_LENGTH} ref={headlineRef} defaultValue={prefill?.headline} className={fieldClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`ad_body_${prefix}`} className={labelClass}>
                Copy
              </label>
              <textarea id={`ad_body_${prefix}`} name={`ad_body_${prefix}`} ref={bodyRef} rows={3} maxLength={TEXT_MAX_LENGTH} className={fieldClass} />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {scripts.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`ad_script_${prefix}`} className={labelClass}>
                    Importar guion (opcional)
                  </label>
                  <select id={`ad_script_${prefix}`} value={scriptId} onChange={(e) => applyScript(e.target.value)} className={fieldClass}>
                    <option value="">Escribir desde cero</option>
                    {scripts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title || 'Guion sin título'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor={`ad_link_${prefix}`} className={labelClass}>
                  Link de destino
                </label>
                <input
                  id={`ad_link_${prefix}`}
                  name={`ad_link_${prefix}`}
                  type="url"
                  defaultValue={prefill?.link}
                  placeholder="URL del producto si lo dejás vacío"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`ad_headline_${prefix}`} className={labelClass}>
                Título
              </label>
              <input id={`ad_headline_${prefix}`} name={`ad_headline_${prefix}`} type="text" maxLength={TITLE_MAX_LENGTH} ref={headlineRef} defaultValue={prefill?.headline} className={fieldClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`ad_body_${prefix}`} className={labelClass}>
                Copy
              </label>
              <textarea id={`ad_body_${prefix}`} name={`ad_body_${prefix}`} ref={bodyRef} rows={3} required maxLength={TEXT_MAX_LENGTH} defaultValue={prefill?.body} className={fieldClass} />
              <AiCopyBar
                hasFile={!!fileName}
                state={copyState}
                variants={variants}
                chosen={chosen}
                onWrite={() => void writeCopy()}
                onChoose={applyVariant}
              />
            </div>

            <div>
              <p className={`mb-1.5 ${labelClass}`}>Tipo de creativo</p>
              <div className="inline-flex rounded-control border border-border p-0.5">
                <button
                  type="button"
                  aria-pressed={mediaType === 'image'}
                  onClick={() => setMediaType('image')}
                  className={`${toggleBase} ${mediaType === 'image' ? 'bg-primary text-white' : 'text-text-2 hover:text-text'}`}
                >
                  Imagen
                </button>
                <button
                  type="button"
                  aria-pressed={mediaType === 'video'}
                  onClick={() => setMediaType('video')}
                  className={`${toggleBase} ${mediaType === 'video' ? 'bg-primary text-white' : 'text-text-2 hover:text-text'}`}
                >
                  Video
                </button>
              </div>
              <input type="hidden" name={`ad_media_type_${prefix}`} value={mediaType} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>{mediaType === 'image' ? 'Imagen' : 'Video'}</label>
              <FileDropzone
                id={`ad_file_${prefix}`}
                accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                required={!upload}
                fileName={fileName}
                onFile={startUpload}
              />
              <input type="hidden" name={`ad_image_hash_${prefix}`} value={mediaType === 'image' ? (ready?.imageHash ?? '') : ''} />
              <input type="hidden" name={`ad_video_id_${prefix}`} value={mediaType === 'video' ? (ready?.videoId ?? '') : ''} />
              <input type="hidden" name={`ad_video_thumbnail_${prefix}`} value={mediaType === 'video' ? (ready?.thumbnailUrl ?? '') : ''} />
              <UploadStatus upload={upload} onRetry={() => lastFileRef.current && startUpload(lastFileRef.current)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function UploadStatus({ upload, onRetry }: { upload: CreativeUploadEvent | null; onRetry?: () => void }) {
  if (!upload) return null
  if (upload.phase === 'waiting') return <p className="text-xs text-text-3">En fila para subir…</p>
  if (upload.phase === 'uploading')
    return (
      <div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-primary transition-all duration-200 ease-out" style={{ width: `${upload.progress}%` }} />
        </div>
        <p className="mt-1 text-xs text-text-3">Subiendo… {upload.progress}%</p>
      </div>
    )
  if (upload.phase === 'processing') return <p className="text-xs text-text-3">Procesando en Meta… podés seguir completando el resto.</p>
  if (upload.phase === 'ready') return <p className="text-xs text-green">Listo en Meta.</p>
  return (
    <p className="text-xs text-red">
      {upload.error}{' '}
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline">
          Reintentar
        </button>
      )}
    </p>
  )
}

function AiCopyBar({
  hasFile,
  state,
  variants,
  chosen,
  onWrite,
  onChoose,
}: {
  hasFile: boolean
  state: { status: 'idle' | 'working' | 'error'; error?: string }
  variants: AdCopyVariant[]
  chosen: number
  onWrite: () => void
  onChoose: (v: AdCopyVariant, i: number) => void
}) {
  const working = state.status === 'working'
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!hasFile || working}
          onClick={onWrite}
          title={hasFile ? undefined : 'Elegí primero el video o la imagen'}
          className="inline-flex items-center gap-1.5 rounded-control border border-accent/40 px-2.5 py-1 text-[11px] font-semibold text-accent transition-all duration-200 ease-out hover:bg-accent/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={working ? 'animate-pulse' : ''}>
            <path d="M12 3l1.8 4.6L18.5 9.5l-4.7 1.9L12 16l-1.8-4.6L5.5 9.5l4.7-1.9L12 3z" />
            <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
          </svg>
          {working ? 'Escuchando el video…' : variants.length ? 'Escribir otras opciones' : 'Escribir copy con IA'}
        </button>
        {!hasFile && <span className="text-[11px] text-text-3">Lee lo que dice y muestra el video.</span>}
        {variants.length > 1 &&
          variants.map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChoose(v, i)}
              aria-pressed={chosen === i}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors duration-200 ease-out ${
                chosen === i ? 'border-accent bg-accent/[0.08] font-semibold text-accent' : 'border-border text-text-2 hover:text-text'
              }`}
            >
              Opción {i + 1}
            </button>
          ))}
      </div>
      {state.status === 'error' && <span className="text-[11px] text-red">{state.error}</span>}
    </div>
  )
}
