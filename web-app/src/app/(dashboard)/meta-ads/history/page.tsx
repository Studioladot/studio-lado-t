import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getLaunchActivityLog } from '@/lib/meta/history'
import { HistoryList } from './history-list'

export default async function MetaAdsHistoryPage() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const entries = await getLaunchActivityLog(supabase, activeOrganizationId)

  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Historial</h1>
        <p className="mt-0.5 max-w-[560px] text-[13px] text-text-2">
          Cada intento de lanzamiento de &ldquo;Lanzar Testeo&rdquo;, con el detalle paso a paso — para saber qué pasó
          cuando algo no salió como esperabas.
        </p>
      </div>

      <HistoryList entries={entries} />
    </div>
  )
}
