import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { OrganizationProvider, type Organization } from '@/lib/context/organization-context'
import { getActiveOrganizationId } from '@/lib/organization/active-organization'
import { OrganizationSwitcher } from '@/components/features/organization-switcher'
import { SignOutButton } from '@/components/features/sign-out-button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // El proxy (src/proxy.ts) ya corrió supabase.auth.getUser() para esta
  // request y, si había usuario, adjuntó su id como header. Confiamos en
  // esa validación en vez de repetir la llamada; solo caemos de nuevo a
  // getUser() si por algún motivo el header no llegó (ej. proxy no corrió).
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

  return (
    <OrganizationProvider
      initialOrganizations={organizations}
      initialActiveOrganizationId={activeOrganizationId}
    >
      <div className="min-h-screen bg-bg">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <span className="text-[15px] font-extrabold tracking-[-0.04em] text-primary">Gotix</span>
          <div className="flex items-center gap-3">
            <OrganizationSwitcher />
            <SignOutButton />
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </OrganizationProvider>
  )
}
