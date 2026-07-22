'use client'

import { useFormStatus } from 'react-dom'
import { signOutAction } from '@/app/(dashboard)/actions'

function SignOutSubmit() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control border border-border px-3 py-1.5 text-xs font-medium text-text-2 transition-all duration-200 ease-out hover:bg-surface-2 hover:text-text active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Saliendo…' : 'Cerrar sesión'}
    </button>
  )
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SignOutSubmit />
    </form>
  )
}
