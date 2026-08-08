'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createCheckoutAction, type CheckoutState } from '@/lib/billing/mercadopago-actions'

const initialState: CheckoutState = { error: null }

function SubmitButton({ planId }: { planId: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-5 w-full rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? 'Redirigiendo a Mercado Pago…' : `Elegir ${planId === 'pro' ? 'Plan Pro' : 'Plan Base'}`}
    </button>
  )
}

export function CheckoutButton({ planId }: { planId: string }) {
  const boundAction = createCheckoutAction.bind(null, planId)
  const [state, formAction] = useActionState(boundAction, initialState)

  return (
    <form action={formAction}>
      <SubmitButton planId={planId} />
      {state.error && <p className="mt-2 text-xs text-red">{state.error}</p>}
    </form>
  )
}
