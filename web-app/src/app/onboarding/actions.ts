'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { setActiveOrganizationCookie } from '@/lib/organization/active-organization'

export type OnboardingState = {
  error: string | null
}

export async function createOrganizationAction(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const rawName = formData.get('name')
  const name = typeof rawName === 'string' ? rawName.trim() : ''

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

  await setActiveOrganizationCookie(organizationId)

  redirect('/dashboard')
}
