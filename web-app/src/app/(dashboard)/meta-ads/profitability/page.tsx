import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { createClient } from '@/lib/supabase/server'
import { getAccountDefaultTargets, getNotificationSettings, getOrganizationRunLog } from '@/lib/meta/autopilot'
import { ProfitabilityWorkspace } from './profitability-workspace'

export default async function ProfitabilityPage() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const [{ targets, unitEconomics }, notificationSettings, runLog] = await Promise.all([
    getAccountDefaultTargets(supabase, activeOrganizationId),
    getNotificationSettings(supabase, activeOrganizationId),
    getOrganizationRunLog(supabase, activeOrganizationId),
  ])

  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Rentabilidad</h1>
        <p className="mt-0.5 max-w-[520px] text-[13px] text-text-2">
          Objetivos de CPA y ROAS a nivel cuenta — se usan automáticamente en todas tus campañas de Meta Ads, salvo que
          una tenga su propio ajuste desde el panel de Automatización.
        </p>
      </div>
      <ProfitabilityWorkspace
        initialTargets={targets}
        initialUnitEconomics={unitEconomics}
        initialNotificationSettings={notificationSettings}
        initialRunLog={runLog}
      />
    </div>
  )
}
