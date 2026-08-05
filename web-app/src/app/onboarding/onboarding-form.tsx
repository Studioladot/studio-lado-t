'use client'

import { useActionState } from 'react'
import { createOrganizationAction, type OnboardingState } from './actions'
import { CreateOrganizationButton } from './create-organization-button'
import { TITLE_MAX_LENGTH } from '@/lib/text-limits'

const initialState: OnboardingState = { error: null }

export function OnboardingForm() {
  const [state, formAction] = useActionState(createOrganizationAction, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="name"
          className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-2"
        >
          Nombre de tu marca o negocio
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="organization"
          required
          autoFocus
          maxLength={TITLE_MAX_LENGTH}
          placeholder="Ej: Kiriz"
          className="rounded-control border border-[#D0D5DD] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#101828] outline-none transition-all duration-200 ease-out placeholder:text-[#667085] focus-visible:ring-2 focus-visible:ring-accent"
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

      <CreateOrganizationButton />
    </form>
  )
}
