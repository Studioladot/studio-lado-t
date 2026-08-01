'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { upsertMetricBenchmarks, type MetricBenchmarks } from '@/lib/meta/benchmarks'

export async function saveBenchmarksAction(values: MetricBenchmarks): Promise<{ ok: boolean; error?: string }> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const ok = await upsertMetricBenchmarks(supabase, activeOrganizationId, values)

  revalidatePath('/meta-ads/metrics')
  return ok ? { ok: true } : { ok: false, error: 'No pudimos guardar los targets.' }
}
