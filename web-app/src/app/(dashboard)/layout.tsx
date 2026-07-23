import { redirect } from 'next/navigation'
import { OrganizationProvider } from '@/lib/context/organization-context'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { OrganizationSwitcher } from '@/components/features/organization-switcher'
import { SignOutButton } from '@/components/features/sign-out-button'
import { DashboardShell } from '@/components/features/dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { organizations, activeOrganizationId } = await getDashboardContext()

  if (organizations.length === 0) {
    redirect('/onboarding')
  }

  return (
    <OrganizationProvider
      initialOrganizations={organizations}
      initialActiveOrganizationId={activeOrganizationId}
    >
      <DashboardShell>
        <header className="flex items-center justify-end gap-3 border-b border-border bg-surface px-6 py-4">
          <OrganizationSwitcher />
          <SignOutButton />
        </header>
        <main className="p-6">{children}</main>
      </DashboardShell>
    </OrganizationProvider>
  )
}
