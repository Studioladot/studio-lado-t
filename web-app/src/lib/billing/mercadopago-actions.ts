'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getRequestOrigin } from '@/lib/http/request-origin'
import { createCheckoutPreference } from './mercadopago'
import { getPlan } from './plans'

export type CheckoutState = { error: string | null }

/**
 * Dispara el checkout de Mercado Pago para el plan elegido — server action
 * llamada desde /paywall y /settings/billing (mismo botón, mismo destino).
 * Redirige directo al init_point real de MP; el estado de la organización
 * recién se actualiza cuando el webhook confirma el pago (ver
 * api/mercadopago/webhook/route.ts), nunca acá — este paso solo abre el
 * checkout, no sabe si el usuario efectivamente va a pagar.
 */
export async function createCheckoutAction(planId: string): Promise<CheckoutState> {
  const plan = getPlan(planId)
  if (!plan) return { error: 'Ese plan no existe.' }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'No pudimos identificar tu cuenta.' }

  const origin = await getRequestOrigin()

  const result = await createCheckoutPreference({
    organizationId: activeOrganizationId,
    planId: plan.id,
    planName: plan.name,
    price: plan.price,
    payerEmail: user.email,
    successUrl: `${origin}/settings/billing?mp=success`,
    failureUrl: `${origin}/paywall?mp=failure`,
    pendingUrl: `${origin}/paywall?mp=pending`,
    notificationUrl: `${origin}/api/mercadopago/webhook`,
  })

  if (!result.ok) return { error: result.error }

  redirect(result.initPoint)
}
