'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { getScriptConversionUploadUrlAction, convertScriptToCreativeAction } from '../actions'
import { CTA_OPTIONS } from '@/lib/meta/library'
import { createClient } from '@/lib/supabase/client'

// Mismo patrón de subida directa a Supabase Storage que creative-form.tsx
// (Biblioteca de Ads) — el archivo nunca pasa por el servidor de Next. La
// diferencia acá es que Nombre/Título/Copy ya vienen heredados del guion,
// no se retipea nada.

const MAX_FILE_MB = 500
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

const FIELD_CLASS =
  'rounded-control border border-border bg-surface-2/60 px-3 py-2 text-sm text-text outline-none transition-all duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent'
const labelClass = 'flex flex-col gap-1.5 text-xs font-medium text-text-2'

export function ConvertToAdModal({
  open,
  onClose,
  scriptId,
  defaultName,
  defaultHeadline,
  defaultPrimaryText,
  onDone,
}: {
  open: boolean
  onClose: () => void
  scriptId: string
  defaultName: string
  defaultHeadline: string
  defaultPrimaryText: string
  onDone: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  if (!open) return null

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (!picked) {
      setFile(null)
      setPreview(null)
      setFileError(null)
      return
    }
    if (picked.size > MAX_FILE_BYTES) {
      setFileError(`"${picked.name}" pesa más de ${MAX_FILE_MB}MB — subí un archivo más liviano.`)
      setFile(null)
      setPreview(null)
      e.target.value = ''
      return
    }
    setFileError(null)
    setFile(picked)
    const url = URL.createObjectURL(picked)
    setPreview({ url, type: picked.type.startsWith('video/') ? 'video' : 'image' })
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    if (!name) {
      setFormError('Ponele un nombre al creativo.')
      return
    }
    if (!file) {
      setFormError('Subí una imagen o un video.')
      return
    }

    setUploading(true)

    const target = await getScriptConversionUploadUrlAction(file.name)
    if (!target.ok) {
      setUploading(false)
      setFormError(target.error)
      return
    }

    const supabase = createClient()
    const { error: uploadError } = await supabase.storage.from('piezas-media').uploadToSignedUrl(target.path, target.token, file)
    if (uploadError) {
      setUploading(false)
      setFormError('No pudimos subir el archivo. Probá de nuevo.')
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('piezas-media').getPublicUrl(target.path)

    const headline = (form.elements.namedItem('headline') as HTMLInputElement).value.trim() || null
    const primaryText = (form.elements.namedItem('primary_text') as HTMLTextAreaElement).value.trim() || null
    const cta = (form.elements.namedItem('cta') as HTMLSelectElement).value

    const result = await convertScriptToCreativeAction({
      scriptId,
      fileUrl: publicUrl,
      assetType: file.type.startsWith('video/') ? 'video' : 'image',
      name,
      headline,
      primaryText,
      cta,
    })

    setUploading(false)
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    onDone()
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-[560px] max-w-full flex-col rounded-card border border-border bg-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Biblioteca de Ads</p>
            <h2 className="mt-0.5 text-[17px] font-bold tracking-[-0.02em] text-text">Convertir a Anuncio</h2>
            <p className="mt-1 text-xs text-text-2">Título y copy ya vienen de este guion — solo falta el archivo.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-text-3 outline-none transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto px-6 py-5">
          <label className={labelClass}>
            Imagen o video
            <input
              name="file"
              type="file"
              accept="image/*,video/*"
              required
              onChange={handleFileChange}
              className="text-xs text-text-2 file:mr-2 file:rounded-control file:border-0 file:bg-surface-2 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-text-2"
            />
          </label>
          <div className="flex h-[140px] w-full items-center justify-center overflow-hidden rounded-control border border-dashed border-border bg-surface-2/60">
            {preview ? (
              preview.type === 'video' ? (
                <video src={preview.url} className="h-full w-full object-cover" muted controls />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt="" className="h-full w-full object-cover" />
              )
            ) : (
              <p className="px-3 text-center text-[11px] text-text-3">La preview aparece acá</p>
            )}
          </div>
          {fileError && <p className="text-[11px] text-red">{fileError}</p>}

          <label className={labelClass}>
            Nombre interno
            <input name="name" type="text" required defaultValue={defaultName} className={FIELD_CLASS} />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Título
              <input name="headline" type="text" defaultValue={defaultHeadline} className={FIELD_CLASS} />
            </label>
            <label className={labelClass}>
              Llamada a la acción
              <select name="cta" defaultValue="LEARN_MORE" className={FIELD_CLASS}>
                {CTA_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={labelClass}>
            Texto principal
            <textarea name="primary_text" rows={3} defaultValue={defaultPrimaryText} className={`resize-none ${FIELD_CLASS}`} />
          </label>

          {formError && <p className="text-xs text-red">{formError}</p>}

          <div className="mt-2 flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="rounded-control bg-primary px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {uploading ? 'Subiendo…' : 'Convertir a Anuncio'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
