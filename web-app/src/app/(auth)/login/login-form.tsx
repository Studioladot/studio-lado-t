'use client'

import { useActionState, useState } from 'react'
import { authAction, type AuthState } from './actions'
import { SubmitButton } from './submit-button'
import { GoogleButton } from './google-button'

const initialState: AuthState = { error: null, info: null }

type Mode = 'login' | 'register'

export function LoginForm() {
  const [mode, setMode] = useState<Mode>('login')
  const [state, formAction] = useActionState(authAction, initialState)

  return (
    <div>
      <div className="mb-6 flex overflow-hidden rounded-control border border-border">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 py-2.5 text-[13px] font-medium tracking-[.08em] transition-all duration-200 ease-out ${
            mode === 'login' ? 'bg-primary text-white' : 'bg-transparent text-text-2'
          }`}
        >
          Ingresar
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`flex-1 py-2.5 text-[13px] font-medium tracking-[.08em] transition-all duration-200 ease-out ${
            mode === 'register' ? 'bg-primary text-white' : 'bg-transparent text-text-2'
          }`}
        >
          Registrarse
        </button>
      </div>

      <form action={formAction} className="flex flex-col gap-3.5">
        <input type="hidden" name="mode" value={mode} />

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
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            required
            placeholder="••••••••"
            className="rounded-control border border-[#D0D5DD] bg-[#F9FAFB] px-3 py-2.5 text-sm text-text outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        <p
          role="alert"
          className={`min-h-[16px] text-xs transition-opacity duration-200 ease-out ${
            state.error ? 'text-red opacity-100' : 'opacity-0'
          }`}
        >
          {state.error}
        </p>

        {state.info && (
          <p role="status" className="-mt-2 text-xs text-green transition-opacity duration-200 ease-out">
            {state.info}
          </p>
        )}

        <SubmitButton mode={mode} />

        <div className="my-1 flex items-center gap-2.5">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] text-text-3">o</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <GoogleButton />
      </form>
    </div>
  )
}
