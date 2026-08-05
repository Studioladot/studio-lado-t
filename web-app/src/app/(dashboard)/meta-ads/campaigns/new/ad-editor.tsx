'use client'

import { useRef, useState } from 'react'
import type { MetaExistingPost } from '@/lib/meta/ad-launch'
import type { LibraryCreative } from '@/lib/meta/library'
import { fieldClass, labelClass, toggleBase } from './wizard-styles'
import { FileDropzone } from './file-dropzone'
import { TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'

type ScriptOption = { id: string; title: string | null; hook: string | null; body: string | null; copy_feed: string | null }

export function AdEditor({
  adSetIndex,
  adIndex,
  adNumber,
  scripts,
  existingPosts,
  libraryCreatives,
  removable,
  onRemove,
}: {
  adSetIndex: number
  adIndex: number
  adNumber: number
  scripts: ScriptOption[]
  existingPosts: MetaExistingPost[]
  libraryCreatives: LibraryCreative[]
  removable: boolean
  onRemove: () => void
}) {
  const [scriptId, setScriptId] = useState('')
  const [mode, setMode] = useState<'new' | 'existing' | 'library'>('new')
  const [libraryAssetId, setLibraryAssetId] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [imageFileName, setImageFileName] = useState<string | null>(null)
  const headlineRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  function selectLibraryAsset(asset: LibraryCreative) {
    setLibraryAssetId(asset.id)
    if (headlineRef.current) headlineRef.current.value = asset.headline ?? ''
    if (bodyRef.current) bodyRef.current.value = asset.primaryText ?? ''
  }

  // El video se sube apenas se elige el archivo (no recién al enviar el
  // formulario entero) — así el progreso que se ve es el real de la subida
  // desde el navegador hacia nuestro servidor (XHR upload.onprogress), no un
  // "Generando…" genérico. El servidor→Meta y el procesamiento de Meta no
  // tienen progreso incremental, por eso quedan como un estado indeterminado.
  const [videoState, setVideoState] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'error'>('idle')
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoFileName, setVideoFileName] = useState<string | null>(null)
  const [videoId, setVideoId] = useState<string | null>(null)
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const lastVideoFileRef = useRef<File | null>(null)

  function applyScript(id: string) {
    setScriptId(id)
    const script = scripts.find((s) => s.id === id)
    if (!script) return
    if (headlineRef.current) headlineRef.current.value = script.title ?? script.hook ?? ''
    if (bodyRef.current) bodyRef.current.value = script.copy_feed || script.body || script.hook || ''
  }

  function uploadVideo(file: File) {
    lastVideoFileRef.current = file
    setVideoFileName(file.name)
    setVideoState('uploading')
    setVideoProgress(0)
    setVideoError(null)
    setVideoId(null)
    setVideoThumbnailUrl(null)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/meta/upload-video')
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const pct = Math.round((event.loaded / event.total) * 100)
      setVideoProgress(pct)
      if (pct >= 100) setVideoState('processing')
    }
    xhr.onload = () => {
      let data: { ok?: boolean; videoId?: string; thumbnailUrl?: string | null; error?: string } = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        // respuesta no-JSON — se maneja abajo como error genérico
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.ok && data.videoId) {
        setVideoId(data.videoId)
        setVideoThumbnailUrl(data.thumbnailUrl ?? null)
        setVideoState('ready')
      } else {
        setVideoError(data.error || 'No se pudo subir el video.')
        setVideoState('error')
      }
    }
    xhr.onerror = () => {
      setVideoError('Error de red subiendo el video.')
      setVideoState('error')
    }
    const formData = new FormData()
    formData.append('video', file)
    xhr.send(formData)
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
          <input id={`ad_name_${prefix}`} name={`ad_name_${prefix}`} type="text" maxLength={TITLE_MAX_LENGTH} placeholder="Opcional" className={fieldClass} />
        </div>

        {(existingPosts.length > 0 || libraryCreatives.length > 0) && (
          <div>
            <p className={`mb-1.5 ${labelClass}`}>Creativo</p>
            <div className="inline-flex flex-wrap rounded-control border border-border p-0.5">
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
          </div>
        )}

        {mode === 'existing' ? (
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
              <input id={`ad_headline_${prefix}`} name={`ad_headline_${prefix}`} type="text" maxLength={TITLE_MAX_LENGTH} ref={headlineRef} className={fieldClass} />
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
                  placeholder="URL del producto si lo dejás vacío"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`ad_headline_${prefix}`} className={labelClass}>
                Título
              </label>
              <input id={`ad_headline_${prefix}`} name={`ad_headline_${prefix}`} type="text" maxLength={TITLE_MAX_LENGTH} ref={headlineRef} className={fieldClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`ad_body_${prefix}`} className={labelClass}>
                Copy
              </label>
              <textarea id={`ad_body_${prefix}`} name={`ad_body_${prefix}`} ref={bodyRef} rows={3} required maxLength={TEXT_MAX_LENGTH} className={fieldClass} />
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

            {mediaType === 'image' ? (
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Imagen</label>
                <FileDropzone
                  id={`ad_image_${prefix}`}
                  name={`ad_image_${prefix}`}
                  accept="image/*"
                  required
                  fileName={imageFileName}
                  onFile={(file) => setImageFileName(file.name)}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Video</label>
                <FileDropzone
                  id={`ad_video_${prefix}`}
                  accept="video/*"
                  required={videoState === 'idle'}
                  fileName={videoFileName}
                  onFile={uploadVideo}
                  hint={videoState === 'idle' ? 'Mejor con archivos cortos y livianos' : undefined}
                />
                <input type="hidden" name={`ad_video_id_${prefix}`} value={videoId ?? ''} />
                <input type="hidden" name={`ad_video_thumbnail_${prefix}`} value={videoThumbnailUrl ?? ''} />

                {videoState === 'uploading' && (
                  <div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full bg-primary transition-all duration-200 ease-out"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-text-3">Subiendo… {videoProgress}%</p>
                  </div>
                )}
                {videoState === 'processing' && (
                  <p className="text-xs text-text-3">Procesando en Meta… puede tardar unos segundos.</p>
                )}
                {videoState === 'ready' && <p className="text-xs text-green">✓ Listo.</p>}
                {videoState === 'error' && (
                  <p className="text-xs text-red">
                    {videoError}{' '}
                    <button
                      type="button"
                      onClick={() => lastVideoFileRef.current && uploadVideo(lastVideoFileRef.current)}
                      className="font-semibold underline"
                    >
                      Reintentar
                    </button>
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
