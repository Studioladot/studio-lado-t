'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { createNoteAction, updateNoteAction, type NoteState } from './actions'
import { TextInput, TextArea, Select } from '@/components/features/form-field'
import type { Database } from '@/lib/types/database.types'

type Note = Database['public']['Tables']['notes']['Row']

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'varios', label: 'Varios' },
  { value: 'fechas', label: 'Fechas importantes' },
  { value: 'conceptos', label: 'Conceptos claves' },
]

// Paleta fija de app.html (no son tokens del tema — las notas
// siempre usan estos 6 pasteles claros, en claro y en oscuro).
const COLORS = ['#fef3d8', '#fbe8e3', '#e8f2f0', '#e4f0fb', '#e4f5e7', '#f0efec']

const initialState: NoteState = { error: null, success: false }

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

export function NoteForm({ note, onDone }: { note?: Note; onDone: () => void }) {
  const [color, setColor] = useState(note?.color ?? COLORS[0])
  const [removeMedia, setRemoveMedia] = useState(false)

  const action = note ? updateNoteAction.bind(null, note.id) : createNoteAction
  const [state, formAction] = useActionState(action, initialState)

  useEffect(() => {
    if (state.success) onDone()
  }, [state.success, onDone])

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <input type="hidden" name="color" value={color} />
      {removeMedia && <input type="hidden" name="remove_media" value="true" />}

      <TextInput
        name="titulo"
        type="text"
        placeholder="Título (opcional)"
        defaultValue={note?.titulo ?? ''}
      />

      <TextArea
        name="contenido"
        rows={4}
        required
        placeholder="Escribí lo que se te ocurra..."
        defaultValue={note?.contenido ?? ''}
      />

      <div className="flex flex-wrap items-center gap-4">
        <Select name="categoria" defaultValue={note?.categoria ?? 'varios'}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>

        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              className="h-6 w-6 rounded-full transition-transform duration-150 ease-out"
              style={{
                backgroundColor: c,
                border: color === c ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">
          Imagen (opcional)
          <input name="media" type="file" accept="image/*" className="text-xs text-text-2" />
        </label>

        {note?.media_url && !removeMedia && (
          <button
            type="button"
            onClick={() => setRemoveMedia(true)}
            className="text-xs font-medium text-text-3 hover:text-red"
          >
            Quitar imagen actual
          </button>
        )}
      </div>

      {state.error && <p className="text-xs text-red">{state.error}</p>}

      <div className="flex items-center gap-3">
        <SubmitButton
          label={note ? 'Guardar cambios' : 'Guardar nota'}
          pendingLabel={note ? 'Guardando…' : 'Guardando…'}
        />
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
