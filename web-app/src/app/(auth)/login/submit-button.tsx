'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1.5 w-full rounded-[20px] bg-primary px-4 py-[11px] text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Ingresando…' : 'Ingresar'}
    </button>
  )
}
