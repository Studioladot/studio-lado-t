'use client'

import { useActionState, useEffect } from 'react'
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

const initialState: PostState = { error: null, success: false }

const fieldClass =
  'rounded-control border border-[#D0D5DD] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#101828] outline-none transition-all duration-200 ease-out placeholder:text-[#667085] focus-visible:ring-2 focus-visible:ring-accent'

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

export function PostForm({ post, onDone }: { post?: Post; onDone: () => void }) {
  const action = post ? updatePostAction.bind(null, post.id) : createPostAction
  const [state, formAction] = useActionState(action, initialState)

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

      <label className={labelClass}>
        Texto / Caption
        <textarea
          name="caption"
          rows={3}
          defaultValue={post?.caption ?? ''}
          placeholder="Texto de la publicación..."
          className={`resize-none normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Plataforma
          <select name="platform" defaultValue={post?.platform ?? 'Instagram'} className={`normal-case tracking-normal ${fieldClass}`}>
            {PLATFORMS.map((p) => (
              <option key={p}>{p}</option>
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

      <div className="grid grid-cols-3 gap-3">
        <label className={labelClass}>
          Fecha
          <input
            name="date"
            type="date"
            defaultValue={post?.date ?? ''}
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
        <label className={labelClass}>
          Estado
          <select name="status" defaultValue={post?.status ?? 'pendiente'} className={`normal-case tracking-normal ${fieldClass}`}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

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
        Imagen o video {post ? '(agregar más)' : ''}
        <input name="media" type="file" accept="image/*,video/*" multiple className="text-xs normal-case tracking-normal text-text-2" />
      </label>

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
