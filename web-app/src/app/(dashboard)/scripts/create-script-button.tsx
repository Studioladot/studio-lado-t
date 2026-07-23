'use client'

import { useFormStatus } from 'react-dom'
import { createScriptAction } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary px-[18px] py-[10px] text-[13px] font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover hover:shadow-[0_0_28px_var(--primary-glow),0_0_8px_rgba(45,91,138,0.2)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Creando…' : '+ Nuevo guion'}
    </button>
  )
}

export function CreateScriptButton() {
  return (
    <form action={createScriptAction}>
      <SubmitButton />
    </form>
  )
}
