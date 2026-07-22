'use server'

import { createClient } from '@/lib/supabase/server'
import { setActiveOrganizationCookie } from './active-organization'

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

  await setActiveOrganizationCookie(organizationId)
}
