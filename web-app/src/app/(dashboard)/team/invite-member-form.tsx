'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { inviteMemberAction, type InviteState } from './actions'
import { TextInput, Select } from '@/components/features/form-field'

const initialState: InviteState = { error: null, success: false }

function InviteButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Invitando…' : 'Invitar'}
    </button>
  )
}

export function InviteMemberForm() {
  const [state, formAction] = useActionState(inviteMemberAction, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">
            Invitar por email
          </span>
          <TextInput name="email" type="email" required placeholder="persona@empresa.com" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">Rol</span>
          <Select name="role" defaultValue="member">
            <option value="member">Miembro</option>
            <option value="admin">Admin</option>
          </Select>
        </label>
        <InviteButton />
      </div>

      <p
        role="alert"
        className={`min-h-[16px] text-xs transition-opacity duration-200 ease-out ${
          state.error ? 'text-red opacity-100' : 'opacity-0'
        }`}
      >
        {state.error}
      </p>

      {state.success && <p className="text-xs text-green">Miembro agregado correctamente.</p>}

      <p className="text-[11px] text-text-3">
        La persona ya tiene que tener una cuenta creada en Gotix con ese email.
      </p>
    </form>
  )
}
