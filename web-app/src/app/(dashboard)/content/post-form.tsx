'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { createPostAction, updatePostAction, type PostState } from './actions'
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
// flujo de trabajo (Idea → Grabación → Edición → Listo para publicar).
// Gotix es una herramienta de planificación, no un programador de
// posteos (decisión de producto, 2026-08-05) — este pipeline es el punto
// final del flujo, no un paso intermedio hacia un auto-publish.
const PRODUCTION_STATUSES = [
  { value: 'idea', label: 'Idea' },
  { value: 'por_grabar', label: 'Por grabar' },
  { value: 'listo_para_programar', label: 'Listo para publicar' },
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
  const [networkTab, setNetworkTab] = useState<'instagram' | 'tiktok'>('instagram')

  // Bug real reportado por la PO (2026-08-01): sin esto, el modal se
  // quedaba abierto y el botón se re-habilitaba apenas terminaba el
  // guardado exitoso — sin ningún feedback de "ya se guardó", el usuario
  // volvía a tocar "Guardar" pensando que no había andado, y
  // createPostAction generaba una fila nueva cada vez (duplicados reales
  // en la base). Mismo patrón que ya usa piece-edit-form.tsx.
  useEffect(() => {
    if (state.success) onDone()
  }, [state.success, onDone])

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
          Texto / Caption (Instagram)
          <textarea
            name="caption"
            rows={3}
            defaultValue={post?.caption ?? ''}
            placeholder="Texto de la publicación..."
            className={`resize-none normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        {!instagramConnected && (
          <p className="text-[11px] text-text-3">Conectá Instagram desde Ajustes → Integraciones para ver sus métricas acá más adelante.</p>
        )}
      </div>

      <div className={networkTab === 'tiktok' ? 'flex flex-col gap-2' : 'hidden'}>
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
        {!tiktokConnected && (
          <p className="text-[11px] text-text-3">Conectá TikTok desde Ajustes → Integraciones para ver sus métricas acá más adelante.</p>
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
      </div>
    </form>
  )
}
