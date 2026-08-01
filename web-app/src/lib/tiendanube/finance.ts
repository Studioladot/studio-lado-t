import type { SupabaseClient } from '@supabase/supabase-js'

// Configuración financiera básica (comisión de Tienda Nube, costo de envío
// promedio, margen bruto, objetivo de ganancia) — alimenta el cálculo de
// margen neto simple de operations/tiendanube. `fin_config` no tiene un
// unique constraint en organization_id (legacy, pensado por usuario) — se
// resuelve a mano (buscar fila existente, update o insert), mismo criterio
// que ya usa business_profile en settings/actions.ts.

export type FinConfig = {
  comisionTnPct: number | null
  costoEnvioPromedio: number | null
  margenBruto: number | null
  objetivoGananciaPct: number | null
  presupuestoAdsMensual: number | null
  /** % del medio de pago (Mercado Pago, tarjeta) — distinto de comisionTnPct, que es lo que cobra Tienda Nube por la plataforma. Sumado 2026-07-27 para la Radiografía de la Orden. */
  pasarelaPct: number | null
  /** IVA/Ingresos Brutos como % de la facturación bruta. Sumado 2026-07-27, mismo motivo que pasarelaPct. */
  impuestosPct: number | null
}

const EMPTY_FIN_CONFIG: FinConfig = {
  comisionTnPct: null,
  costoEnvioPromedio: null,
  margenBruto: null,
  objetivoGananciaPct: null,
  presupuestoAdsMensual: null,
  pasarelaPct: null,
  impuestosPct: null,
}

/**
 * `error: true` distingue "todavía no configuró nada" (fila inexistente,
 * `data === null` sin `error`) de "la lectura falló de verdad" (Supabase
 * devolvió un error) — antes ambos casos se trataban igual y devolvían
 * EMPTY_FIN_CONFIG en silencio, así que un fallo real de lectura se veía
 * idéntico a una cuenta nueva sin configurar (auditoría de cierre,
 * 2026-07-30). El caller decide si mostrar un banner de error real.
 */
export async function getFinConfig(supabase: SupabaseClient, organizationId: string): Promise<{ config: FinConfig; error: boolean }> {
  const { data, error } = await supabase
    .from('fin_config')
    .select('comision_tn_pct, costo_envio_promedio, margen_bruto, objetivo_ganancia_pct, presupuesto_ads_mensual, pasarela_pct, impuestos_pct')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (!data) return { config: EMPTY_FIN_CONFIG, error: !!error }
  return {
    config: {
      comisionTnPct: data.comision_tn_pct,
      costoEnvioPromedio: data.costo_envio_promedio,
      margenBruto: data.margen_bruto,
      objetivoGananciaPct: data.objetivo_ganancia_pct,
      presupuestoAdsMensual: data.presupuesto_ads_mensual,
      pasarelaPct: data.pasarela_pct,
      impuestosPct: data.impuestos_pct,
    },
    error: false,
  }
}

export async function upsertFinConfig(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  values: FinConfig
): Promise<boolean> {
  const { data: existing } = await supabase.from('fin_config').select('id').eq('organization_id', organizationId).maybeSingle()

  const fields = {
    comision_tn_pct: values.comisionTnPct,
    costo_envio_promedio: values.costoEnvioPromedio,
    margen_bruto: values.margenBruto,
    objetivo_ganancia_pct: values.objetivoGananciaPct,
    presupuesto_ads_mensual: values.presupuestoAdsMensual,
    pasarela_pct: values.pasarelaPct,
    impuestos_pct: values.impuestosPct,
  }

  const { error } = existing
    ? await supabase.from('fin_config').update(fields).eq('id', existing.id)
    : await supabase.from('fin_config').insert({ ...fields, organization_id: organizationId, user_id: userId })

  return !error
}

// ---------------------------------------------------------------------------
// Cascada de Rentabilidad (Dashboard de Rentabilidad Neta, 2026-07-25;
// separación Comisión Tienda Nube / Comisión Pasarela / Impuestos agregada
// 2026-07-27 para que la Cascada agregada y la Radiografía de la Orden por
// orden — ledger, ver orders.ts:buildOrderLedger — cuenten la misma historia
// con las mismas categorías, nunca dos números de "neto" distintos).
// ---------------------------------------------------------------------------

export type ProfitWaterfallStep = { label: string; value: number; cumulative: number }

export type ProfitWaterfall = {
  bruto: number
  cogs: number
  metaSpend: number
  envio: number
  comisionTn: number
  comisionPasarela: number
  impuestos: number
  opex: number
  neto: number
  steps: ProfitWaterfallStep[]
}

export function computeProfitWaterfall(params: {
  bruto: number
  cogs: number
  metaSpend: number
  envio: number
  comisionTn: number
  comisionPasarela: number
  impuestos: number
  /** Costos Fijos (OpEx) ya prorrateados al período activo — ver page.tsx (total mensual × días_período/30). */
  opex: number
}): ProfitWaterfall {
  const { bruto, cogs, metaSpend, envio, comisionTn, comisionPasarela, impuestos, opex } = params
  const neto = bruto - cogs - metaSpend - envio - comisionTn - comisionPasarela - impuestos - opex

  let cumulative = bruto
  const steps: ProfitWaterfallStep[] = [{ label: 'Facturación Bruta', value: bruto, cumulative: bruto }]
  const deductions: [string, number][] = [
    ['Costo de Producto', -cogs],
    ['Meta Ads', -metaSpend],
    ['Envíos', -envio],
    ['Comisión Tienda Nube', -comisionTn],
    ['Comisión Pasarela', -comisionPasarela],
    ['Impuestos', -impuestos],
    ['Costos Fijos (OpEx)', -opex],
  ]
  for (const [label, value] of deductions) {
    cumulative += value
    steps.push({ label, value, cumulative })
  }
  steps.push({ label: 'Resultado Neto Real', value: neto, cumulative: neto })

  return { bruto, cogs, metaSpend, envio, comisionTn, comisionPasarela, impuestos, opex, neto, steps }
}
