import { cache } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrganizationId } from './active-organization'
import { getSubscriptionStatus, type SubscriptionStatus } from '@/lib/billing/subscription'
import type { Organization } from '@/lib/context/organization-context'

/**
 * Resuelve usuario + organizaciones + organización activa una sola vez por
 * request (memoizado con React cache()), para que el layout de (dashboard)
 * y cualquier page.tsx que necesite el organization_id activo para filtrar
 * sus queries no dupliquen las consultas a Supabase.
 *
 * Uso en una page.tsx nueva:
 *   const { activeOrganizationId } = await getDashboardContext()
 *   const supabase = await createClient()
 *   const { data } = await supabase
 *     .from('content_posts')
 *     .select('*')
 *     .eq('organization_id', activeOrganizationId)
 */
export const getDashboardContext = cache(async () => {
  const supabase = await createClient()

  const headerList = await headers()
  let userId = headerList.get('x-user-id')

  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    userId = user.id
  }

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)

  const orgIds = (memberships ?? []).map((m) => m.organization_id)

  const { data: orgs } =
    orgIds.length > 0
      ? await supabase.from('organizations').select('*').in('id', orgIds)
      : { data: [] as Organization[] }

  const roleByOrgId = new Map((memberships ?? []).map((m) => [m.organization_id, m.role]))

  const organizations: Organization[] = (orgs ?? []).map((org) => ({
    ...org,
    role: roleByOrgId.get(org.id) ?? 'member',
  }))

  const activeOrganizationId = await getActiveOrganizationId(organizations.map((org) => org.id))

  // Expuesto acá (no solo en el layout) para que las Server Actions que
  // escriben datos de negocio puedan cortar con assertActiveSubscription()
  // sin pegarle a la DB de nuevo — ver comentario en subscription.ts.
  const activeOrg = organizations.find((org) => org.id === activeOrganizationId) ?? null
  const subscriptionStatus: SubscriptionStatus | null = activeOrg ? getSubscriptionStatus(activeOrg) : null

  return { userId, organizations, activeOrganizationId, subscriptionStatus }
})
