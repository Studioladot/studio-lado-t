'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { addPieceMediaAction, type AddMediaState } from './actions'

const initialState: AddMediaState = { error: null }

function AddMediaButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary px-3 py-1.5 text-[11px] font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Subiendo…' : 'Subir'}
    </button>
  )
}

export function AddPieceMediaForm({ pieceId, campaignId }: { pieceId: string; campaignId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const boundAction = addPieceMediaAction.bind(null, pieceId, campaignId)
  const [state, formAction] = useActionState(boundAction, initialState)

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
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <input
        name="media_files"
        type="file"
        accept="image/*,video/*"
        multiple
        className="text-[12px] text-text-2 file:mr-2 file:rounded-control file:border-0 file:bg-surface-2 file:px-2.5 file:py-1 file:text-[11px] file:font-medium file:text-text-2 file:transition-all file:duration-200 file:ease-out hover:file:bg-border-2"
      />
      {state.error && <p className="text-xs text-red">{state.error}</p>}
      <div className="flex items-center gap-3">
        <AddMediaButton />
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
