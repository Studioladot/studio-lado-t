import { redirect } from 'next/navigation'
import { OrganizationProvider } from '@/lib/context/organization-context'
import { CurrencyProvider } from '@/lib/context/currency-context'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { createClient } from '@/lib/supabase/server'
import { getUsdArsRate, type Currency } from '@/lib/currency'
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

  // Se resuelven acá (server) para que el primer render del cliente ya
  // tenga todo — evita un fetch/parpadeo propio del CurrencyProvider al
  // montar. Ninguna de las dos requiere el organization_id para tener
  // sentido salvo la moneda de cuenta, que si no hay conexión Meta todavía
  // cae a USD (comportamiento actual, sin forzar nada).
  const supabase = await createClient()
  const [{ data: connection }, usdArsRate] = await Promise.all([
    activeOrganizationId
      ? supabase.from('meta_connections').select('account_currency').eq('organization_id', activeOrganizationId).maybeSingle()
      : Promise.resolve({ data: null }),
    getUsdArsRate(),
  ])
  const accountCurrency: Currency = connection?.account_currency === 'ARS' ? 'ARS' : 'USD'

  return (
    <OrganizationProvider
      initialOrganizations={organizations}
      initialActiveOrganizationId={activeOrganizationId}
    >
      <CurrencyProvider initialAccountCurrency={accountCurrency} initialUsdArsRate={usdArsRate}>
        <DashboardShell>
          <header className="flex items-center justify-end gap-3 border-b border-border bg-surface px-6 py-4">
            <OrganizationSwitcher />
            <SignOutButton />
          </header>
          <main className="p-6">{children}</main>
        </DashboardShell>
      </CurrencyProvider>
    </OrganizationProvider>
  )
}
