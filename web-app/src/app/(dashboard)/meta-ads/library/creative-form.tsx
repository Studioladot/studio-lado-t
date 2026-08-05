'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { getLibraryUploadUrlAction, createLibraryCreativeRecordAction } from './actions'
import { CTA_OPTIONS } from '@/lib/meta/library'
import { createClient } from '@/lib/supabase/client'
import { CharCounterTextarea } from '@/components/features/char-counter-textarea'
import { TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'

// Techo de cordura, no una vuelta al límite de los Server Actions — el
// archivo ya no pasa por Next (ver handleSubmit: sube directo a Supabase
// Storage con una URL firmada), así que esto solo evita que alguien
// arrastre por error un archivo de varios GB.
const MAX_FILE_MB = 500
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

// Theme-aware a propósito — el fieldClass de content/post-form.tsx está
// hardcodeado a colores claros y no sirve acá (pauta explícita: dark/light
// impecables). Mismo criterio que custom-rule-modal.tsx.
const FIELD_CLASS =
  'rounded-control border border-border bg-surface-2/60 px-3 py-2 text-sm text-text outline-none transition-all duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent'

const labelClass = 'flex flex-col gap-1.5 text-xs font-medium text-text-2'

export function CreativeForm({ onDone }: { onDone: () => void }) {
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

    const target = await getLibraryUploadUrlAction(file.name)
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

    const result = await createLibraryCreativeRecordAction({
      fileUrl: publicUrl,
      assetType: file.type.startsWith('video/') ? 'video' : 'image',
      name,
      primaryText,
      headline,
      cta,
    })

    setUploading(false)
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 sm:flex-row sm:gap-5">
      <div className="flex shrink-0 flex-col gap-2 sm:w-[200px]">
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
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <label className={labelClass}>
          Nombre interno
          <input name="name" type="text" required maxLength={TITLE_MAX_LENGTH} placeholder="Ej: Hook lluvia — remera oversize" className={FIELD_CLASS} />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Título
            <input name="headline" type="text" maxLength={TITLE_MAX_LENGTH} placeholder="Título del anuncio" className={FIELD_CLASS} />
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
          <CharCounterTextarea
            name="primary_text"
            rows={3}
            maxLength={TEXT_MAX_LENGTH}
            placeholder="Copy del anuncio..."
            className={`resize-none ${FIELD_CLASS}`}
          />
        </label>

        {formError && <p className="text-xs text-red">{formError}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={uploading}
            className="rounded-control bg-primary px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {uploading ? 'Subiendo…' : 'Guardar creativo'}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  )
}
