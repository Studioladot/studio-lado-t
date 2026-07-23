import { redirect } from 'next/navigation'
import { OrganizationProvider } from '@/lib/context/organization-context'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { OrganizationSwitcher } from '@/components/features/organization-switcher'
import { SignOutButton } from '@/components/features/sign-out-button'
import { DashboardNav } from '@/components/features/dashboard-nav'

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
      <div className="min-h-screen bg-bg">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div className="flex items-center gap-6">
            <span className="text-[15px] font-extrabold tracking-[-0.04em] text-primary">Gotix</span>
            <DashboardNav />
          </div>
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
