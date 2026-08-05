'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { updateScriptAction, deleteScriptAction, type UpdateScriptState } from '../actions'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { TextInput, TextArea, Select, FORM_LABEL_CLASS } from '@/components/features/form-field'
import { TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'
import { ConvertToAdModal } from './convert-to-ad-modal'
import { ANGLES, STATUSES, STATUS_LABEL } from '../constants'
import type { Database } from '@/lib/types/database.types'

type Script = Database['public']['Tables']['scripts']['Row']

const initialState: UpdateScriptState = { error: null, success: false }

const labelClass = FORM_LABEL_CLASS

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
  const [convertOpen, setConvertOpen] = useState(false)
  const router = useRouter()

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/scripts" className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text">
          ← Guiones
        </Link>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setConvertOpen(true)}
            className="rounded-control border border-accent/30 bg-accent/[0.06] px-2.5 py-1 text-[11px] font-semibold text-accent transition-all duration-200 ease-out hover:bg-accent/[0.12]"
          >
            Convertir a Anuncio
          </button>
          <form action={deleteScriptAction.bind(null, script.id)}>
            <ConfirmSubmitButton
              confirmMessage={`¿Borrar el guion "${script.title ?? 'Sin título'}"?`}
              className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
            >
              Borrar
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
        <label className={labelClass}>
          Título
          <TextInput
            name="title"
            type="text"
            required
            maxLength={TITLE_MAX_LENGTH}
            defaultValue={script.title ?? ''}
            className="text-base normal-case tracking-normal"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            Ángulo
            <Select name="angle" defaultValue={script.angle ?? ANGLES[0]} className="normal-case tracking-normal">
              {ANGLES.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
          </label>
          <label className={labelClass}>
            Producto
            <TextInput
              name="product"
              type="text"
              maxLength={TITLE_MAX_LENGTH}
              defaultValue={script.product ?? ''}
              placeholder="Ej: Campera Eme…"
              className="normal-case tracking-normal"
            />
          </label>
          <label className={labelClass}>
            Estado
            <Select name="status" defaultValue={script.status ?? 'borrador'} className="normal-case tracking-normal">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <label className={labelClass}>
          Hook (primeros 3 segundos)
          <TextArea
            maxLength={TEXT_MAX_LENGTH}
            name="hook"
            rows={2}
            defaultValue={script.hook ?? ''}
            placeholder="Qué dice o muestra en el primer momento…"
            className="normal-case tracking-normal"
          />
        </label>

        <label className={labelClass}>
          Desarrollo (cuerpo del video)
          <TextArea
            maxLength={TEXT_MAX_LENGTH}
            name="body"
            rows={8}
            defaultValue={script.body ?? ''}
            placeholder="El video completo, escena a escena…"
            className="normal-case tracking-normal"
          />
        </label>

        <label className={labelClass}>
          CTA (cierre)
          <TextArea
            maxLength={TEXT_MAX_LENGTH}
            name="cta"
            rows={2}
            defaultValue={script.cta ?? ''}
            placeholder="Cómo termina — qué hace el espectador…"
            className="normal-case tracking-normal"
          />
        </label>

        <label className={labelClass}>
          Copy del feed (texto del anuncio)
          <TextArea
            maxLength={TEXT_MAX_LENGTH}
            name="copy_feed"
            rows={3}
            defaultValue={script.copy_feed ?? ''}
            placeholder="Texto que va en el feed de Instagram/TikTok…"
            className="normal-case tracking-normal"
          />
        </label>

        <label className={labelClass}>
          Notas y resultados
          <TextArea
            maxLength={TEXT_MAX_LENGTH}
            name="notes"
            rows={3}
            defaultValue={script.notes ?? ''}
            placeholder="ROAS logrado, qué funcionó, qué cambiarías…"
            className="normal-case tracking-normal"
          />
        </label>

        {state.error && <p className="text-xs text-red">{state.error}</p>}
        {state.success && <p className="text-xs text-green">Guardado correctamente.</p>}

        <div>
          <SaveButton />
        </div>
      </form>

      <ConvertToAdModal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        scriptId={script.id}
        defaultName={script.title ?? 'Sin título'}
        defaultHeadline={script.hook ?? ''}
        defaultPrimaryText={script.copy_feed || script.body || ''}
        onDone={() => {
          setConvertOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
