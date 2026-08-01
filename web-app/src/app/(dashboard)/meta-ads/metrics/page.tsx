import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getMetricBenchmarks } from '@/lib/meta/benchmarks'
import { BenchmarksForm } from './benchmarks-form'

export default async function MetaAdsMetricsPage() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const benchmarks = await getMetricBenchmarks(supabase, activeOrganizationId)

  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Tablas de Métricas</h1>
        <p className="mt-0.5 max-w-[560px] text-[13px] text-text-2">
          Benchmarks de industria y tus propios targets, para saber si una campaña nueva está rindiendo bien o no.
        </p>
      </div>

      <BenchmarksForm initialBenchmarks={benchmarks} />
    </div>
  )
}
