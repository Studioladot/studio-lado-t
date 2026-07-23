'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateScriptAction, deleteScriptAction, type UpdateScriptState } from '../actions'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { ANGLES, STATUSES, STATUS_LABEL } from '../constants'
import type { Database } from '@/lib/types/database.types'

type Script = Database['public']['Tables']['scripts']['Row']

const initialState: UpdateScriptState = { error: null, success: false }

const fieldClass =
  'rounded-control border border-[#D0D5DD] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#101828] outline-none transition-all duration-200 ease-out placeholder:text-[#667085] focus-visible:ring-2 focus-visible:ring-accent'

const labelClass = 'flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

function SaveButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Guardando…' : 'Guardar'}
    </button>
  )
}

export function ScriptEditForm({ script }: { script: Script }) {
  const boundAction = updateScriptAction.bind(null, script.id)
  const [state, formAction] = useActionState(boundAction, initialState)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/scripts" className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text">
          ← Guiones
        </Link>
        <form action={deleteScriptAction.bind(null, script.id)}>
          <ConfirmSubmitButton
            confirmMessage={`¿Borrar el guion "${script.title ?? 'Sin título'}"?`}
            className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
          >
            Borrar
          </ConfirmSubmitButton>
        </form>
      </div>

      <form action={formAction} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
        <label className={labelClass}>
          Título
          <input
            name="title"
            type="text"
            required
            defaultValue={script.title ?? ''}
            className={`text-base normal-case tracking-normal ${fieldClass}`}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            Ángulo
            <select name="angle" defaultValue={script.angle ?? ANGLES[0]} className={`normal-case tracking-normal ${fieldClass}`}>
              {ANGLES.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Producto
            <input
              name="product"
              type="text"
              defaultValue={script.product ?? ''}
              placeholder="Ej: Campera Eme…"
              className={`normal-case tracking-normal ${fieldClass}`}
            />
          </label>
          <label className={labelClass}>
            Estado
            <select name="status" defaultValue={script.status ?? 'borrador'} className={`normal-case tracking-normal ${fieldClass}`}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={labelClass}>
          Hook (primeros 3 segundos)
          <textarea
            name="hook"
            rows={2}
            defaultValue={script.hook ?? ''}
            placeholder="Qué dice o muestra en el primer momento…"
            className={`resize-none normal-case tracking-normal ${fieldClass}`}
          />
        </label>

        <label className={labelClass}>
          Desarrollo (cuerpo del video)
          <textarea
            name="body"
            rows={8}
            defaultValue={script.body ?? ''}
            placeholder="El video completo, escena a escena…"
            className={`resize-none normal-case tracking-normal ${fieldClass}`}
          />
        </label>

        <label className={labelClass}>
          CTA (cierre)
          <textarea
            name="cta"
            rows={2}
            defaultValue={script.cta ?? ''}
            placeholder="Cómo termina — qué hace el espectador…"
            className={`resize-none normal-case tracking-normal ${fieldClass}`}
          />
        </label>

        <label className={labelClass}>
          Copy del feed (texto del anuncio)
          <textarea
            name="copy_feed"
            rows={3}
            defaultValue={script.copy_feed ?? ''}
            placeholder="Texto que va en el feed de Instagram/TikTok…"
            className={`resize-none normal-case tracking-normal ${fieldClass}`}
          />
        </label>

        <label className={labelClass}>
          Notas y resultados
          <textarea
            name="notes"
            rows={3}
            defaultValue={script.notes ?? ''}
            placeholder="ROAS logrado, qué funcionó, qué cambiarías…"
            className={`resize-none normal-case tracking-normal ${fieldClass}`}
          />
        </label>

        {state.error && <p className="text-xs text-red">{state.error}</p>}
        {state.success && <p className="text-xs text-green">Guardado correctamente.</p>}

        <div>
          <SaveButton />
        </div>
      </form>
    </div>
  )
}
