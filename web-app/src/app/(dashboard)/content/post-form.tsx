'use client'

import { useState, type FormEvent } from 'react'
import { createPostAction, updatePostAction, type PostState } from './actions'
import { uploadReferenceFilesClient } from '@/lib/media/upload-client'
import { useToast } from '@/components/features/toast'
import { MiniSpinner } from '@/components/features/action-pill'
import { CharCounterTextarea } from '@/components/features/char-counter-textarea'
import { FORMATOS, PLATAFORMAS, ProductionStatusSelect, TurnoSelect, NetworkCopyTabs, fieldClass, labelClass } from './piece-form-shared'
import { PillarField } from '@/components/features/pillar-field'
import { TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'
import type { Database } from '@/lib/types/database.types'
import type { ContentPillar } from '@/lib/pillars'

type Post = Database['public']['Tables']['content_posts']['Row']

// `status` — flag legacy propio de content_posts, del que dependen las
// rachas de control-panel.tsx. Distinto de production_status (compartido,
// ver piece-form-shared.tsx) — este selector es exclusivo de Publicaciones
// sueltas, las piezas de campaña no lo tienen en su form (se cambia con un
// toggle aparte en pieces-list.tsx).
const STATUSES = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'publicado', label: 'Publicado' },
]

export function PostForm({
  post,
  pillars,
  instagramConnected,
  tiktokConnected,
  defaultDate,
  onDone,
}: {
  post?: Post
  pillars: ContentPillar[]
  instagramConnected: boolean
  tiktokConnected: boolean
  defaultDate?: string
  onDone: () => void
}) {
  const [networkTab, setNetworkTab] = useState<'instagram' | 'tiktok'>('instagram')
  const [pending, setPending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  // Submit manual (no useActionState) desde el fix de subida directa
  // cliente→Storage (bug real reportado, 2026-08-06): las Referencias se
  // suben ANTES de llamar al Server Action — mandar el File dentro de la
  // Server Action pegaba contra el límite de ~4.5MB de las funciones
  // serverless de Vercel (413), ver upload-client.ts. Mismo patrón que
  // add-piece-form.tsx: sin el try/catch, cualquier excepción real deja el
  // botón colgado en "Guardando…" para siempre (bug ya corregido antes,
  // 2026-08-06).
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const toastId = toast.show('Guardando…', 'pending')

    const formData = new FormData(e.currentTarget)

    const referenceFiles = formData.getAll('reference').filter((f): f is File => f instanceof File && f.size > 0)
    formData.delete('reference')
    if (referenceFiles.length > 0) {
      setUploading(true)
      const uploaded = await uploadReferenceFilesClient(referenceFiles)
      setUploading(false)
      if (uploaded.error) {
        setPending(false)
        setError(uploaded.error)
        toast.dismiss(toastId)
        return
      }
      formData.set('reference_media', JSON.stringify(uploaded.media))
    }

    const action = post ? updatePostAction.bind(null, post.id) : createPostAction
    let result: PostState
    try {
      result = await action({ error: null, success: false }, formData)
    } catch (err) {
      if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
        throw err
      }
      console.error('[PostForm] excepción inesperada al guardar la publicación:', err)
      setPending(false)
      setError('No pudimos guardar la publicación. Probá de nuevo en unos minutos.')
      toast.dismiss(toastId)
      return
    }
    setPending(false)

    if (!result.success) {
      setError(result.error)
      toast.dismiss(toastId)
      return
    }

    toast.update(toastId, 'Guardado con éxito', 'success')

    // Bug real reportado por la PO (2026-08-01): antes esto dependía de un
    // useEffect mirando `state.success` — sin feedback de "ya se guardó" el
    // usuario volvía a tocar "Guardar" pensando que no había andado, y se
    // duplicaba la fila. Acá cerrar es parte directa del mismo submit.
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <label className={labelClass}>
        Título
        <input
          name="title"
          type="text"
          required
          maxLength={TITLE_MAX_LENGTH}
          defaultValue={post?.title ?? ''}
          placeholder="Ej: Campera EME — Drop Invierno"
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Estado de Producción
          <ProductionStatusSelect defaultValue={post?.production_status ?? 'idea'} />
        </label>
        <label className={labelClass}>
          Formato
          <select name="format" defaultValue={post?.format ?? 'Reel'} className={`normal-case tracking-normal ${fieldClass}`}>
            {FORMATOS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          Plataforma
          <select name="platform" defaultValue={post?.platform ?? 'Instagram'} className={`normal-case tracking-normal ${fieldClass}`}>
            {PLATAFORMAS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Fecha
          <input
            name="date"
            type="date"
            defaultValue={post?.date ?? defaultDate ?? ''}
            className={`normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        <label className={labelClass}>
          Turno
          <TurnoSelect defaultValue={post?.turno ?? 'Temprano'} />
        </label>
      </div>

      <PillarField pillars={pillars} defaultValue={post?.pillar ?? ''} />

      <label className={labelClass}>
        Estado (manual)
        <select name="status" defaultValue={post?.status ?? 'pendiente'} className={`normal-case tracking-normal ${fieldClass}`}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        Protagonista (opcional)
        <input
          name="protagonista"
          type="text"
          maxLength={TITLE_MAX_LENGTH}
          defaultValue={post?.protagonista ?? ''}
          placeholder="Quién actúa en el video..."
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <label className={labelClass}>
        Notas internas (no se publican)
        <CharCounterTextarea
          name="notes"
          rows={2}
          maxLength={TEXT_MAX_LENGTH}
          defaultValue={post?.notes ?? ''}
          placeholder="Hook, guion, referencia, idea…"
          className={`resize-none normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <label className={labelClass}>
        Referencias (moodboard, tomas crudas, guion visual)
        <input name="reference" type="file" accept="image/*,video/*" multiple className="text-xs normal-case tracking-normal text-text-2" />
        <span className="text-[11px] font-normal normal-case tracking-normal text-text-3">
          Material de apoyo para grabar/editar — la pieza final se sube directo desde la app de cada red.
        </span>
      </label>

      {/* Configuración por red — el copy queda listo acá para pegarlo al
          publicar manualmente desde la app nativa de cada red (decisión de
          producto, 2026-08-05: Gotix es planificación, no un programador de
          posteos). */}
      <NetworkCopyTabs
        networkTab={networkTab}
        onNetworkTabChange={setNetworkTab}
        captionDefault={post?.caption}
        tiktokCaptionDefault={post?.tiktok_caption}
        instagramConnected={instagramConnected}
        tiktokConnected={tiktokConnected}
      />

      {error && <p className="text-xs text-red">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        >
          {pending && <MiniSpinner />}
          {uploading ? 'Subiendo archivos…' : pending ? 'Guardando…' : post ? 'Guardar cambios' : 'Guardar publicación'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
