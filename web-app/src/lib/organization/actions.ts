'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_ORGANIZATION_COOKIE } from './active-organization'

export async function setActiveOrganizationAction(organizationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return
  }

  // No confiar en el id que manda el cliente sin verificar membresía —
  // aunque RLS ya protege los datos reales, esto evita persistir una
  // cookie apuntando a una organización a la que el usuario no pertenece.
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (!membership) {
    return
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}
