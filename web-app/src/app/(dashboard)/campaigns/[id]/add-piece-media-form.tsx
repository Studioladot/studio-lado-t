'use client'

import { useRef, useState, type FormEvent } from 'react'
import { addPieceMediaAction, type AddMediaState } from './actions'
import { uploadReferenceFilesClient } from '@/lib/media/upload-client'

export function AddPieceMediaForm({ pieceId, campaignId }: { pieceId: string; campaignId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Subida directa cliente→Storage (bug real reportado, 2026-08-06): mismo
  // fix que add-piece-form.tsx — el archivo se sube ANTES de llamar al
  // Server Action, que solo recibe la URL pública ya resuelta.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const files = formData.getAll('media_files').filter((f): f is File => f instanceof File && f.size > 0)

    if (files.length === 0) {
      setPending(false)
      setError('Elegí al menos un archivo.')
      return
    }

    setUploading(true)
    const uploaded = await uploadReferenceFilesClient(files)
    setUploading(false)

    if (uploaded.error) {
      setPending(false)
      setError(uploaded.error)
      return
    }

    const newFormData = new FormData()
    newFormData.set('reference_media', JSON.stringify(uploaded.media))

    let result: AddMediaState
    try {
      result = await addPieceMediaAction(pieceId, campaignId, { error: null }, newFormData)
    } catch (err) {
      // redirect('/login') de addPieceMediaAction (sesión vencida) tira una
      // excepción especial con digest "NEXT_REDIRECT" — hay que dejarla
      // pasar para que el framework navegue de verdad (mismo criterio que
      // add-piece-form.tsx).
      if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
        throw err
      }
      console.error('[AddPieceMediaForm] excepción inesperada al guardar la referencia:', err)
      setPending(false)
      setError('No pudimos guardar el archivo. Probá de nuevo en unos minutos.')
      return
    }

    setPending(false)

    if (result.error) {
      setError(result.error)
      return
    }

    formRef.current?.reset()
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-[11px] font-medium text-primary transition-colors duration-200 ease-out hover:text-primary-hover"
      >
        + Agregar Referencia
      </button>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2">
      <input
        name="media_files"
        type="file"
        accept="image/*,video/*"
        multiple
        className="text-[12px] text-text-2 file:mr-2 file:rounded-control file:border-0 file:bg-surface-2 file:px-2.5 file:py-1 file:text-[11px] file:font-medium file:text-text-2 file:transition-all file:duration-200 file:ease-out hover:file:bg-border-2"
      />
      {error && <p className="text-xs text-red">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-control bg-primary px-3 py-1.5 text-[11px] font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {uploading ? 'Subiendo…' : pending ? 'Guardando…' : 'Subir'}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-[11px] font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
        >
          Cerrar
        </button>
      </div>
    </form>
  )
}
