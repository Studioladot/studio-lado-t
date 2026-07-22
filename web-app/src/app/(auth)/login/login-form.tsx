'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from './actions'
import { SubmitButton } from './submit-button'

const initialState: LoginState = { error: null }

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-2"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="vos@empresa.com"
          className="rounded-control border border-[#D0D5DD] bg-[#F9FAFB] px-3 py-2.5 text-sm text-text outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-2"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="rounded-control border border-[#D0D5DD] bg-[#F9FAFB] px-3 py-2.5 text-sm text-text outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <p
        role="alert"
        className={`min-h-[16px] text-xs text-red transition-opacity duration-200 ease-out ${
          state.error ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {state.error}
      </p>

      <SubmitButton />
    </form>
  )
}
