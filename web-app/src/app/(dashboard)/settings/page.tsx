import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { BusinessProfileForm } from './business-profile-form'

export default async function SettingsPage() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('business_profile')
    .select('*')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Perfil de negocio</h1>
        <p className="mt-0.5 text-[13px] text-text-2">
          Esto define cómo piensa y responde tu IA sobre tu marca.
        </p>
      </div>

      <div className="rounded-card border border-border bg-surface p-5">
        <BusinessProfileForm profile={profile ?? null} />
      </div>
    </div>
  )
}
