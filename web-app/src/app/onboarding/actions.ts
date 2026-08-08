'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { setActiveOrganizationCookie } from '@/lib/organization/active-organization'
import { clamp, TITLE_MAX_LENGTH } from '@/lib/text-limits'
import { trialEndsAtFromNow } from '@/lib/billing/subscription'

export type OnboardingState = {
  error: string | null
}

export async function createOrganizationAction(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const rawName = formData.get('name')
  const name = typeof rawName === 'string' ? clamp(rawName.trim(), TITLE_MAX_LENGTH) : ''

  if (!name) {
    return { error: 'Ingresá el nombre de tu marca o negocio.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // create_organization_with_owner es una función SECURITY DEFINER en
  // Postgres: crea la organización y la membresía (role='owner') en una
  // sola transacción atómica, sin necesitar el service role acá — la
  // elevación de privilegios queda contenida del lado de la base de datos,
  // nunca en el frontend. Ver frontend-taste.md / commit para el SQL.
  const { data: organizationId, error } = await supabase.rpc('create_organization_with_owner', {
    org_name: name,
  })

  if (error || !organizationId) {
    return { error: 'No pudimos crear tu organización. Probá de nuevo.' }
  }

  // Trial de 7 días — arranca acá, explícito, en vez de confiar en un
  // default de columna que no está documentado en ningún archivo de
  // migración de este repo (create_organization_with_owner tampoco lo
  // fija). Si esto falla, no bloquea el alta: la organización ya se creó
  // bien, y getSubscriptionStatus trata un trial_ends_at nulo como "recién
  // empezado" en vez de bloquear a alguien por un dato faltante.
  await supabase.from('organizations').update({ plan: 'trial', trial_ends_at: trialEndsAtFromNow() }).eq('id', organizationId)

  await setActiveOrganizationCookie(organizationId)

  redirect('/dashboard')
}
