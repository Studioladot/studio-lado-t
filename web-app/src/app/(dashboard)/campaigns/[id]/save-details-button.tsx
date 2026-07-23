'use client'

import { useFormStatus } from 'react-dom'

export function SaveDetailsButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded-control bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Guardando…' : 'Guardar cambios'}
    </button>
  )
}
