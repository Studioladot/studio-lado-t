'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { createPostAction, updatePostAction, cancelPostScheduleAction, type PostState } from './actions'
import { ContentPreviewSimulator } from './content-preview-simulator'
import type { Database } from '@/lib/types/database.types'

type Post = Database['public']['Tables']['content_posts']['Row']

const PLATFORMS = ['Instagram', 'TikTok', 'Ambas', 'YouTube']
const FORMATOS = ['Reel', 'TikTok', 'Carrusel', 'Historia', 'Post', 'Video largo', 'Otro']
const TURNOS = ['Temprano', 'Tarde', 'Noche']
const STATUSES = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'publicado', label: 'Publicado' },
]
// Pipeline de producción (Épica Omnicanal, 2026-08-04) — separado a
// propósito de `status` arriba: `status` es el flag legacy del que
// dependen las rachas de control-panel.tsx, este es el estado real del
// flujo de trabajo asíncrono (Idea → Grabación → Edición → Publicación).
const PRODUCTION_STATUSES = [
  { value: 'idea', label: 'Idea' },
  { value: 'por_grabar', label: 'Por grabar' },
  { value: 'listo_para_programar', label: 'Listo para programar' },
  { value: 'programado', label: 'Programado' },
  { value: 'publicado', label: 'Publicado' },
]

const initialState: PostState = { error: null, success: false }

// Mismo fix que add-piece-form.tsx/piece-edit-form.tsx (2026-07-30):
// colores theme-aware en vez de hex hardcodeado (#D0D5DD/#F9FAFB/#101828),
// que rompía en dark mode.
const fieldClass =
  'rounded-control border border-border bg-surface-2/60 px-3 py-2.5 text-sm text-text outline-none transition-all duration-200 ease-out placeholder:text-text-3 focus:border-accent focus-visible:ring-2 focus-visible:ring-accent'

const labelClass = 'flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Guardando…' : label}
    </button>
  )
}

export function PostForm({
  post,
  instagramConnected,
  tiktokConnected,
  defaultDate,
  onDone,
}: {
  post?: Post
  instagramConnected: boolean
  tiktokConnected: boolean
  defaultDate?: string
  onDone: () => void
}) {
  const action = post ? updatePostAction.bind(null, post.id) : createPostAction
  const [state, formAction] = useActionState(action, initialState)
  const [scheduleOn, setScheduleOn] = useState(post?.publish_status === 'scheduled')
  const [tiktokScheduleOn, setTiktokScheduleOn] = useState(post?.tiktok_publish_status === 'scheduled')
  const [networkTab, setNetworkTab] = useState<'instagram' | 'tiktok'>('instagram')
  // Object URL creado/revocado directo en el onChange del input (event
  // handler, no efecto) — ver comentario en content-preview-simulator.tsx
  // sobre por qué esto no vive en un useEffect.
  const [finalPreview, setFinalPreview] = useState<{ url: string; isVideo: boolean } | null>(null)

  // Bug real reportado por la PO (2026-08-01): sin esto, el modal se
  // quedaba abierto y el botón se re-habilitaba apenas terminaba el
  // guardado exitoso — sin ningún feedback de "ya se guardó", el usuario
  // volvía a tocar "Guardar" pensando que no había andado, y
  // createPostAction generaba una fila nueva cada vez (duplicados reales
  // en la base). Mismo patrón que ya usa piece-edit-form.tsx.
  useEffect(() => {
    if (state.success) onDone()
  }, [state.success, onDone])

  function handleFinalFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFinalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      const file = e.target.files?.[0]
      if (!file) return null
      return { url: URL.createObjectURL(file), isVideo: file.type.startsWith('video/') }
    })
  }

  const isLocked = post?.publish_status === 'publishing' || post?.publish_status === 'published'

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <label className={labelClass}>
        Título
        <input
          name="title"
          type="text"
          required
          defaultValue={post?.title ?? ''}
          placeholder="Ej: Campera EME — Drop Invierno"
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Estado de Producción
          <select name="production_status" defaultValue={post?.production_status ?? 'idea'} className={`normal-case tracking-normal ${fieldClass}`}>
            {PRODUCTION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
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
            {PLATFORMS.map((p) => (
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
          <select name="turno" defaultValue={post?.turno ?? 'Temprano'} className={`normal-case tracking-normal ${fieldClass}`}>
            {TURNOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

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
          defaultValue={post?.protagonista ?? ''}
          placeholder="Quién actúa en el video..."
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      {/* Referencias vs Archivo Final (Épica Omnicanal, 2026-08-04) —
          separados a propósito: Referencias es el moodboard/tomas crudas
          que nunca se publica, Archivo Final es EL video/imagen que se
          sube a las redes (un solo archivo, no álbum). */}
      <label className={labelClass}>
        Referencias (moodboard, tomas crudas — no se publican)
        <input name="reference" type="file" accept="image/*,video/*" multiple className="text-xs normal-case tracking-normal text-text-2" />
      </label>

      <label className={labelClass}>
        Archivo Final (MP4/MOV — el que se publica) {post?.media_url ? '(reemplazar)' : ''}
        <input
          name="media"
          type="file"
          accept="image/*,video/*"
          onChange={handleFinalFileChange}
          className="text-xs normal-case tracking-normal text-text-2"
        />
        <span className="text-[11px] font-normal normal-case tracking-normal text-text-3">
          Un solo archivo — si subís uno nuevo, reemplaza al anterior.
        </span>
      </label>

      <ContentPreviewSimulator
        previewUrl={finalPreview?.url ?? post?.media_url ?? null}
        isVideo={finalPreview ? finalPreview.isVideo : post?.media_type === 'video'}
        caption={post?.caption ?? ''}
      />

      {/* Configuración por red — Instagram y TikTok se programan y
          escriben de forma independiente, mismo archivo final para las
          dos (Épica Omnicanal, 2026-08-04). */}
      <div className="flex gap-1 rounded-control border border-border bg-surface-2/40 p-1">
        <button
          type="button"
          onClick={() => setNetworkTab('instagram')}
          className={`flex-1 rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
            networkTab === 'instagram' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
          }`}
        >
          Configuración Instagram
        </button>
        <button
          type="button"
          onClick={() => setNetworkTab('tiktok')}
          className={`flex-1 rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
            networkTab === 'tiktok' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
          }`}
        >
          Configuración TikTok
        </button>
      </div>

      <div className={networkTab === 'instagram' ? 'flex flex-col gap-3' : 'hidden'}>
        <label className={labelClass}>
          Texto / Caption (Instagram)
          <textarea
            name="caption"
            rows={3}
            defaultValue={post?.caption ?? ''}
            placeholder="Texto de la publicación..."
            className={`resize-none normal-case tracking-normal ${fieldClass}`}
          />
        </label>

        {isLocked ? (
          <div className="rounded-control border border-border bg-surface-2/40 p-3 text-[11px] text-text-3">
            {post?.publish_status === 'published'
              ? 'Ya se publicó en Instagram — no se puede reprogramar.'
              : 'Se está publicando ahora mismo — no se puede editar la programación en este momento.'}
          </div>
        ) : (
          <div className={`rounded-control border p-3 ${instagramConnected ? 'border-accent/30 bg-accent/[0.04]' : 'border-border bg-surface-2/40'}`}>
            <label className="flex items-center gap-2 text-xs font-semibold text-text">
              <input
                type="checkbox"
                name="schedule_enabled"
                disabled={!instagramConnected}
                checked={scheduleOn}
                onChange={(e) => setScheduleOn(e.target.checked)}
                className="disabled:cursor-not-allowed"
              />
              Programar auto-publicación en Instagram
            </label>
            {!instagramConnected ? (
              <p className="mt-1.5 text-[11px] text-text-3">Conectá Instagram desde Ajustes → Integraciones para poder programar.</p>
            ) : (
              scheduleOn && (
                <label className="mt-2.5 flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">
                  Fecha y hora de publicación
                  <input
                    name="scheduled_at"
                    type="datetime-local"
                    required={scheduleOn}
                    defaultValue={toDatetimeLocal(post?.scheduled_at ?? null)}
                    className={`normal-case tracking-normal ${fieldClass}`}
                  />
                  <span className="text-[11px] font-normal normal-case tracking-normal text-text-3">
                    La publicación de video es asíncrona — puede salir unos minutos después de la hora elegida.
                  </span>
                </label>
              )
            )}
            {post?.publish_status === 'failed' && post.publish_error && (
              <p className="mt-2 text-[11px] text-red">No pudimos publicar este contenido. Revisá el archivo y volvé a intentarlo, o contactá a soporte si el problema persiste.</p>
            )}
          </div>
        )}
      </div>

      <div className={networkTab === 'tiktok' ? 'flex flex-col gap-3' : 'hidden'}>
        {!tiktokConnected ? (
          <div className="rounded-control border border-dashed border-border bg-surface-2/40 p-3 text-[11px] text-text-3">
            Conectá TikTok primero — la publicación automática en TikTok todavía no está disponible.
          </div>
        ) : (
          <>
            <label className={labelClass}>
              Texto / Caption (TikTok)
              <textarea
                name="tiktok_caption"
                rows={3}
                defaultValue={post?.tiktok_caption ?? ''}
                placeholder="Texto de la publicación..."
                className={`resize-none normal-case tracking-normal ${fieldClass}`}
              />
            </label>
            <div className="rounded-control border border-accent/30 bg-accent/[0.04] p-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-text">
                <input
                  type="checkbox"
                  name="tiktok_schedule_enabled"
                  checked={tiktokScheduleOn}
                  onChange={(e) => setTiktokScheduleOn(e.target.checked)}
                />
                Programar auto-publicación en TikTok
              </label>
              {tiktokScheduleOn && (
                <label className="mt-2.5 flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">
                  Fecha y hora de publicación
                  <input
                    name="tiktok_scheduled_at"
                    type="datetime-local"
                    required={tiktokScheduleOn}
                    defaultValue={toDatetimeLocal(post?.tiktok_scheduled_at ?? null)}
                    className={`normal-case tracking-normal ${fieldClass}`}
                  />
                </label>
              )}
            </div>
          </>
        )}
      </div>

      {state.error && <p className="text-xs text-red">{state.error}</p>}

      <div className="flex items-center gap-3">
        <SubmitButton label={post ? 'Guardar cambios' : 'Guardar publicación'} />
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
        >
          Cancelar
        </button>
        {post?.publish_status === 'scheduled' && (
          <form action={cancelPostScheduleAction.bind(null, post.id)} className="ml-auto">
            <button type="submit" className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red">
              Cancelar programación
            </button>
          </form>
        )}
      </div>
    </form>
  )
}
