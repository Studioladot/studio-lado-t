'use client'

import { useRef, useState, type FormEvent } from 'react'
import { createPieceAction, type CreatePieceState } from './actions'
import { uploadReferenceFilesClient } from '@/lib/media/upload-client'
import { useToast } from '@/components/features/toast'
import { MiniSpinner } from '@/components/features/action-pill'

const FORMATOS = ['Reel', 'TikTok', 'Carrusel', 'Historia', 'Post', 'Video largo', 'Otro']
const PLATAFORMAS = ['Instagram', 'TikTok', 'Ambas', 'YouTube']
const TURNOS = ['Temprano', 'Tarde', 'Noche']
// Ver post-form.tsx (Épica Omnicanal, 2026-08-04) — mismo pipeline de
// producción, separado del `status` legacy que ya usan las rachas. Punto
// final del flujo de creación (decisión de producto, 2026-08-05): Gotix es
// planificación, no un programador de posteos.
const PRODUCTION_STATUSES = [
  { value: 'idea', label: 'Idea' },
  { value: 'por_grabar', label: 'Por grabar' },
  { value: 'listo_para_programar', label: 'Listo para publicar' },
  { value: 'programado', label: 'Programado' },
  { value: 'publicado', label: 'Publicado' },
]

// Mismo tratamiento de input que operating-costs-card.tsx/sales-tabs.tsx —
// theme-aware (bg-surface-2, border-border, text-text). Antes esto tenía
// colores hardcodeados (#D0D5DD/#F9FAFB/#101828) que no reaccionaban a
// data-theme="dark": en modo oscuro los campos quedaban claros, rompiendo
// la estética premium en este módulo específicamente.
const fieldClass =
  'rounded-control border border-border bg-surface-2/60 px-3 py-2.5 text-sm text-text outline-none transition-all duration-200 ease-out placeholder:text-text-3 focus:border-accent focus-visible:ring-2 focus-visible:ring-accent'

const labelClass = 'flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

export function AddPieceForm({
  campaignId,
  instagramConnected,
  tiktokConnected,
  startOpen = false,
  defaultDate,
  onDone,
}: {
  campaignId: string
  instagramConnected: boolean
  tiktokConnected: boolean
  /** El Calendario (content-calendar.tsx) embebe este form ya abierto, sin el botón colapsado — ahí "cerrar" significa cerrar el modal entero, no volver al botón. */
  startOpen?: boolean
  defaultDate?: string
  onDone?: () => void
}) {
  const [isOpen, setIsOpen] = useState(startOpen)
  const [networkTab, setNetworkTab] = useState<'instagram' | 'tiktok'>('instagram')
  const [justAdded, setJustAdded] = useState(false)
  const [pending, setPending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const justAddedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toast = useToast()

  // Submit manual (no useActionState) a propósito: necesitamos resetear el
  // form y mostrar "pieza agregada" dentro del mismo gesto de envío, sin
  // pasar por un useEffect — llamar setState desde un efecto dispara
  // react-hooks/set-state-in-effect (mismo motivo que Date.now()/Math.random()
  // en otros lados de esta sesión). Un handler de evento no tiene ese problema:
  // es exactamente el patrón que ya usa FinConfigCard en sales-tabs.tsx.
  //
  // Subida directa cliente→Storage (bug real reportado, 2026-08-06): las
  // Referencias se suben ANTES de llamar al Server Action — mandar el File
  // dentro de la Server Action pegaba contra el límite de ~4.5MB de las
  // funciones serverless de Vercel (413), ver upload-client.ts.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const toastId = toast.show('Guardando…', 'pending')

    const formData = new FormData(e.currentTarget)

    const referenceFiles = formData.getAll('reference_files').filter((f): f is File => f instanceof File && f.size > 0)
    formData.delete('reference_files')
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

    let result: CreatePieceState
    try {
      result = await createPieceAction({ error: null, success: false }, formData)
    } catch (err) {
      // redirect('/login') de createPieceAction (sesión vencida) funciona
      // tirando una excepción especial con digest "NEXT_REDIRECT" — hay que
      // dejarla pasar para que el framework haga la navegación real, nunca
      // tratarla como un error nuestro.
      if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
        throw err
      }
      // Bug real reportado (2026-08-06): sin este catch, cualquier
      // excepción real acá (falla inesperada al subir el archivo, corte de
      // red, un error del servidor no contemplado) dejaba `pending` en
      // true para siempre — el botón se quedaba en "Agregando…" sin
      // ningún mensaje, indistinguible de una carga que nunca termina.
      console.error('[AddPieceForm] excepción inesperada al guardar la pieza:', err)
      setPending(false)
      setError('No pudimos guardar la pieza. Probá de nuevo en unos minutos.')
      toast.dismiss(toastId)
      return
    }
    setPending(false)

    if (!result.success) {
      setError(result.error)
      toast.dismiss(toastId)
      return
    }

    toast.update(toastId, 'Pieza agregada con éxito', 'success')

    if (onDone) {
      onDone()
      return
    }

    // Modo inline (detalle de campaña, sin modal encima): en vez de cerrar,
    // resetea el formulario y lo deja abierto para la próxima pieza — antes
    // había que cerrar y volver a abrir "+ Nueva pieza" para cada una.
    formRef.current?.reset()
    setJustAdded(true)
    if (justAddedTimeout.current) clearTimeout(justAddedTimeout.current)
    justAddedTimeout.current = setTimeout(() => setJustAdded(false), 2500)
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-fit rounded-control border border-primary/25 bg-transparent px-4 py-2 text-[13px] font-semibold text-primary transition-all duration-200 ease-out hover:bg-primary/[6%] active:scale-[0.98]"
      >
        + Nueva pieza
      </button>
    )
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-5"
    >
      <input type="hidden" name="campaign_id" value={campaignId} />

      <label className={labelClass}>
        Título
        <input
          name="titulo"
          type="text"
          required
          autoFocus
          placeholder="Ej: Reel unboxing, Carrusel 5 outfits…"
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Estado de Producción
          <select name="production_status" defaultValue="idea" className={`normal-case tracking-normal ${fieldClass}`}>
            {PRODUCTION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Formato
          <select name="formato" defaultValue="Reel" className={`normal-case tracking-normal ${fieldClass}`}>
            {FORMATOS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          Plataforma
          <select name="plataforma" defaultValue="Instagram" className={`normal-case tracking-normal ${fieldClass}`}>
            {PLATAFORMAS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Fecha planificada
          <input name="fecha_planificada" type="date" defaultValue={defaultDate} className={`normal-case tracking-normal ${fieldClass}`} />
        </label>
        <label className={labelClass}>
          Turno
          <select name="turno" defaultValue="Temprano" className={`normal-case tracking-normal ${fieldClass}`}>
            {TURNOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <label className={labelClass}>
        Protagonista (opcional)
        <input
          name="protagonista"
          type="text"
          placeholder="Quién actúa en el video…"
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <label className={labelClass}>
        Notas internas (no se publican)
        <textarea
          name="notas"
          rows={2}
          placeholder="Hook, guion, referencia, idea…"
          className={`resize-none normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <label className={labelClass}>
        Referencias (moodboard, tomas crudas, guion visual)
        <input
          name="reference_files"
          type="file"
          accept="image/*,video/*"
          multiple
          className="text-[13px] font-normal normal-case tracking-normal text-text-2 file:mr-3 file:rounded-control file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-text-2 file:transition-all file:duration-200 file:ease-out hover:file:bg-border-2"
        />
        <span className="text-[11px] font-normal normal-case tracking-normal text-text-3">
          Material de apoyo para grabar/editar — la pieza final se sube directo desde la app de cada red.
        </span>
      </label>

      <div className="flex gap-1 rounded-control border border-border bg-surface-2/40 p-1">
        <button
          type="button"
          onClick={() => setNetworkTab('instagram')}
          className={`flex-1 rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
            networkTab === 'instagram' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
          }`}
        >
          Copy Instagram
        </button>
        <button
          type="button"
          onClick={() => setNetworkTab('tiktok')}
          className={`flex-1 rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
            networkTab === 'tiktok' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
          }`}
        >
          Copy TikTok
        </button>
      </div>

      <div className={networkTab === 'instagram' ? 'flex flex-col gap-2' : 'hidden'}>
        <label className={labelClass}>
          Copy (texto que se publica en Instagram)
          <textarea
            name="caption"
            rows={2}
            placeholder="El texto que va a acompañar la publicación — distinto de las notas internas de arriba."
            className={`resize-none normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        {!instagramConnected && (
          <p className="text-[11px] text-text-3">Conectá Instagram desde Ajustes → Integraciones para ver sus métricas acá más adelante.</p>
        )}
      </div>

      <div className={networkTab === 'tiktok' ? 'flex flex-col gap-2' : 'hidden'}>
        <label className={labelClass}>
          Copy (texto que se publica en TikTok)
          <textarea
            name="tiktok_caption"
            rows={2}
            placeholder="El texto que va a acompañar la publicación en TikTok."
            className={`resize-none normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        {!tiktokConnected && (
          <p className="text-[11px] text-text-3">Conectá TikTok desde Ajustes → Integraciones para ver sus métricas acá más adelante.</p>
        )}
      </div>

      <p
        role="alert"
        className={`min-h-[16px] text-xs transition-opacity duration-200 ease-out ${
          error ? 'text-red opacity-100' : 'opacity-0'
        }`}
      >
        {error}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        >
          {pending && <MiniSpinner />}
          {uploading ? 'Subiendo archivos…' : pending ? 'Agregando…' : 'Agregar pieza'}
        </button>
        <button
          type="button"
          onClick={() => (onDone ? onDone() : setIsOpen(false))}
          className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
        >
          {onDone ? 'Cancelar' : 'Listo'}
        </button>
        {justAdded && (
          <span className="flex items-center gap-1 text-xs font-semibold text-green">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Pieza agregada — cargá la próxima o tocá &ldquo;Listo&rdquo;
          </span>
        )}
      </div>
    </form>
  )
}
