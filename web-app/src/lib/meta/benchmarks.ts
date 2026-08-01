import type { SupabaseClient } from '@supabase/supabase-js'

// Tablas de Métricas — targets personalizados de benchmarks (Hook Rate,
// CTR, ROAS, CPA, CPM, Frecuencia, P25/P100 de retención de video). Una
// fila por organización, igual patrón que el default de cuenta de
// campaign_targets. Distinto de campaign_targets: eso es CPA/ROAS
// financiero (breakeven/objetivo, usado por el Autopiloto); esto es
// referencia de rendimiento creativo/de entrega, puramente informativo.

export type MetricBenchmarks = {
  hookRateTarget: number | null
  ctrTarget: number | null
  roasMin: number | null
  roasTarget: number | null
  cpaMax: number | null
  cpmMax: number | null
  freqMax: number | null
  p25Target: number | null
  p100Target: number | null
}

const EMPTY_BENCHMARKS: MetricBenchmarks = {
  hookRateTarget: null,
  ctrTarget: null,
  roasMin: null,
  roasTarget: null,
  cpaMax: null,
  cpmMax: null,
  freqMax: null,
  p25Target: null,
  p100Target: null,
}

export async function getMetricBenchmarks(supabase: SupabaseClient, organizationId: string): Promise<MetricBenchmarks> {
  const { data } = await supabase
    .from('metric_benchmarks')
    .select('hook_rate_target, ctr_target, roas_min, roas_target, cpa_max, cpm_max, freq_max, p25_target, p100_target')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (!data) return EMPTY_BENCHMARKS
  return {
    hookRateTarget: data.hook_rate_target,
    ctrTarget: data.ctr_target,
    roasMin: data.roas_min,
    roasTarget: data.roas_target,
    cpaMax: data.cpa_max,
    cpmMax: data.cpm_max,
    freqMax: data.freq_max,
    p25Target: data.p25_target,
    p100Target: data.p100_target,
  }
}

export async function upsertMetricBenchmarks(
  supabase: SupabaseClient,
  organizationId: string,
  values: MetricBenchmarks
): Promise<boolean> {
  const { error } = await supabase.from('metric_benchmarks').upsert(
    {
      organization_id: organizationId,
      hook_rate_target: values.hookRateTarget,
      ctr_target: values.ctrTarget,
      roas_min: values.roasMin,
      roas_target: values.roasTarget,
      cpa_max: values.cpaMax,
      cpm_max: values.cpmMax,
      freq_max: values.freqMax,
      p25_target: values.p25Target,
      p100_target: values.p100Target,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' }
  )

  return !error
}
