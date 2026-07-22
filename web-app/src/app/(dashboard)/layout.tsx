import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrganizationProvider, type Organization } from '@/lib/context/organization-context'
import { OrganizationSwitcher } from '@/components/features/organization-switcher'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)

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

  return (
    <OrganizationProvider initialOrganizations={organizations}>
      <div className="min-h-screen">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">Gotix</span>
          <OrganizationSwitcher />
        </header>
        <main className="p-6">{children}</main>
      </div>
    </OrganizationProvider>
  )
}
