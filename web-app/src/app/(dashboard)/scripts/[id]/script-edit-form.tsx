'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateScriptAction, deleteScriptAction, generateHookVariantsAction } from '../actions'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { useToast } from '@/components/features/toast'
import { ConvertToAdModal } from './convert-to-ad-modal'
import { WinnerBadge } from '../winner-badge'
import { ANGLES, STATUSES, STATUS_LABEL, STATUS_COLOR } from '../constants'
import { TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'
import type { Database } from '@/lib/types/database.types'

type Script = Database['public']['Tables']['scripts']['Row']

const SAVE_DEBOUNCE_MS = 900

// Pulido UX/UI (2026-08-07): la primera versión del editor tipo Notion sacó
// TODA caja/borde de los campos y quedó demasiado plano — sin affordance,
// parecía un documento de solo lectura en vez de un formulario editable.
// Ahora los bloques de texto vuelven a tener una caja sutil (bg tenue +
// borde fino, mismo lenguaje que fieldClass en piece-form-shared.tsx, pero
// definido acá aparte porque cada instancia pisa tamaño/color de texto —
// mezclar eso con la utilidad compartida arriesga colisiones de
// especificidad de Tailwind entre `text-sm` y los `text-[15px]`/`text-[13px]`
// puntuales de cada campo). Regla del pedido: cero íconos/emojis, todo se
// resuelve con tipografía + espaciado + color.
const flowingFieldClass =
  'rounded-control border border-border bg-surface-2/40 px-3 py-2.5 outline-none transition-all duration-200 ease-out focus:border-accent focus-visible:ring-2 focus-visible:ring-accent'

// Labels un poco más oscuros y pesados que antes (text-text-3 → text-text-2,
// font-bold → font-extrabold) — tienen que separar cada sección del
// formulario por sí solos, sin apoyarse en ningún ícono ni línea divisoria.
const sectionLabelClass = 'text-[10px] font-extrabold uppercase tracking-wide text-text-2'

// Autocrece con el contenido (sin scrollbar interno) y mantiene el mismo
// contador de caracteres que ya tenía TextArea (form-field.tsx) para no
// perder esa protección.
function FlowingTextarea({
  name,
  defaultValue,
  placeholder,
  maxLength,
  minRows = 2,
  className = '',
}: {
  name: string
  defaultValue: string
  placeholder: string
  maxLength: number
  minRows?: number
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [length, setLength] = useState(defaultValue.length)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  return (
    <div className="flex flex-col gap-1">
      <textarea
        ref={ref}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={minRows}
        onInput={(e) => {
          const el = e.currentTarget
          el.style.height = 'auto'
          el.style.height = `${el.scrollHeight}px`
          setLength(el.value.length)
        }}
        className={`w-full resize-none leading-relaxed text-text placeholder:text-text-3 ${flowingFieldClass} ${className}`}
      />
      <span className="self-end text-[10px] tabular-nums text-text-3">
        {length} / {maxLength}
      </span>
    </div>
  )
}

function SaveStatus({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'idle') return null
  return (
    <span className={`text-[11px] font-medium ${state === 'error' ? 'text-red' : 'text-text-3'}`}>
      {state === 'saving' ? 'Guardando…' : state === 'error' ? 'No se pudo guardar' : 'Guardado'}
    </span>
  )
}

export function ScriptEditForm({
  script,
  isWinner,
  variants,
  parentScript,
}: {
  script: Script
  isWinner: boolean
  variants: Script[]
  parentScript: { id: string; title: string | null } | null
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [convertOpen, setConvertOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()
  const toast = useToast()

  async function saveNow() {
    if (!formRef.current) return
    const formData = new FormData(formRef.current)
    const result = await updateScriptAction(script.id, { error: null, success: false }, formData)
    setSaveState(result.error ? 'error' : 'saved')
  }

  function scheduleSave() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveState('saving')
    debounceRef.current = setTimeout(saveNow, SAVE_DEBOUNCE_MS)
  }

  // Guarda de inmediato al salir del formulario entero (click afuera,
  // navegar a "← Guiones") — sin esto, un cambio que quedó dentro de la
  // ventana de debounce se podía perder si el usuario se iba rápido.
  function flushOnBlur(e: React.FocusEvent<HTMLFormElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    saveNow()
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  async function handleGenerateHooks() {
    setGenerating(true)
    const result = await generateHookVariantsAction(script.id)
    setGenerating(false)
    if (!result.ok) {
      toast.show(result.error, 'error')
      return
    }
    toast.show(`${result.count} variantes del gancho generadas.`, 'success')
    router.refresh()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/scripts" className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text">
          ← Guiones
        </Link>
        <div className="flex items-center gap-4">
          <SaveStatus state={saveState} />
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

      {isWinner && <WinnerBadge />}

      {parentScript && (
        <p className="mb-3 text-xs text-text-2">
          Variante del hook de{' '}
          <Link href={`/scripts/${parentScript.id}`} className="font-medium text-accent hover:text-primary-hover">
            {parentScript.title || 'Sin título'}
          </Link>
        </p>
      )}

      <form ref={formRef} onChange={scheduleSave} onBlur={flushOnBlur} onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6 rounded-card border border-border bg-surface p-6">
        <input
          name="title"
          type="text"
          required
          maxLength={TITLE_MAX_LENGTH}
          defaultValue={script.title ?? ''}
          placeholder="Sin título"
          className="border-0 bg-transparent text-2xl font-bold tracking-[-0.02em] text-text outline-none placeholder:text-text-3"
        />

        <div className="flex flex-wrap items-center gap-2">
          <select
            name="angle"
            defaultValue={script.angle ?? ANGLES[0]}
            className="rounded-full border border-border bg-surface-2/60 px-2.5 py-1 text-[11px] font-medium text-text-2 outline-none transition-colors duration-150 ease-out focus:border-accent"
          >
            {ANGLES.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <input
            name="product"
            type="text"
            maxLength={TITLE_MAX_LENGTH}
            defaultValue={script.product ?? ''}
            placeholder="Producto"
            className="min-w-[120px] max-w-[220px] flex-1 rounded-full border border-border bg-surface-2/60 px-2.5 py-1 text-[11px] font-medium text-text-2 outline-none transition-colors duration-150 ease-out placeholder:text-text-3 focus:border-accent"
          />
          <select
            name="status"
            defaultValue={script.status ?? 'borrador'}
            className={`rounded-full border border-border bg-surface-2/60 px-2.5 py-1 text-[11px] font-bold outline-none transition-colors duration-150 ease-out focus:border-accent ${STATUS_COLOR[script.status ?? ''] ?? 'text-text-2'}`}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <p className={sectionLabelClass}>Hook (primeros 3 segundos)</p>
            <button
              type="button"
              onClick={handleGenerateHooks}
              disabled={generating}
              className="shrink-0 rounded-control px-2.5 py-1 text-[11px] font-semibold text-accent transition-colors duration-150 ease-out hover:bg-surface-2 disabled:cursor-wait disabled:opacity-50"
            >
              {generating ? 'Generando…' : 'Generar 3 variantes'}
            </button>
          </div>
          <FlowingTextarea
            name="hook"
            defaultValue={script.hook ?? ''}
            placeholder="Qué dice o muestra en el primer momento…"
            maxLength={TEXT_MAX_LENGTH}
            minRows={2}
            className="text-[15px] font-medium"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <p className={sectionLabelClass}>Desarrollo (cuerpo del video)</p>
          <FlowingTextarea
            name="body"
            defaultValue={script.body ?? ''}
            placeholder="El video completo, escena a escena…"
            maxLength={TEXT_MAX_LENGTH}
            minRows={7}
            className="text-[15px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <p className={sectionLabelClass}>CTA (cierre)</p>
          <FlowingTextarea
            name="cta"
            defaultValue={script.cta ?? ''}
            placeholder="Cómo termina — qué hace el espectador…"
            maxLength={TEXT_MAX_LENGTH}
            minRows={2}
            className="text-[15px]"
          />
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border pt-5">
          <p className={sectionLabelClass}>Copy del feed (texto del anuncio)</p>
          <FlowingTextarea
            name="copy_feed"
            defaultValue={script.copy_feed ?? ''}
            placeholder="Texto que va en el feed de Instagram/TikTok…"
            maxLength={TEXT_MAX_LENGTH}
            minRows={3}
            className="text-[13px] text-text-2"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <p className={sectionLabelClass}>Notas y resultados</p>
          <FlowingTextarea
            name="notes"
            defaultValue={script.notes ?? ''}
            placeholder="ROAS logrado, qué funcionó, qué cambiarías…"
            maxLength={TEXT_MAX_LENGTH}
            minRows={2}
            className="text-[13px] text-text-2"
          />
        </div>
      </form>

      {variants.length > 0 && (
        <div className="mt-4 rounded-card border border-border bg-surface p-5">
          <p className={`mb-3 ${sectionLabelClass}`}>Variantes del gancho ({variants.length})</p>
          <ul className="flex flex-col gap-2">
            {variants.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/scripts/${v.id}`}
                  className="block truncate rounded-control border border-border bg-surface-2/60 px-3 py-2 text-xs text-text transition-colors duration-200 ease-out hover:border-accent/40"
                >
                  {v.hook || v.title || 'Sin título'}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

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
