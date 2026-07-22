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

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert({ name })
    .select('id')
    .single()

  if (orgError || !organization) {
    return { error: 'No pudimos crear tu organización. Probá de nuevo.' }
  }

  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({ organization_id: organization.id, user_id: user.id, role: 'owner' })

  if (memberError) {
    // Evita dejar una organización huérfana sin miembros si el segundo
    // insert falla — sin esta limpieza, nadie podría volver a acceder a
    // esa fila (RLS la deja inalcanzable sin una membresía).
    await supabase.from('organizations').delete().eq('id', organization.id)
    return { error: 'No pudimos asignarte a la organización. Probá de nuevo.' }
  }

  await setActiveOrganizationCookie(organization.id)

  redirect('/dashboard')
}
