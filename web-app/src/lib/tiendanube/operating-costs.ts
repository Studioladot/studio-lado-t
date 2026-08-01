import type { SupabaseClient } from '@supabase/supabase-js'

// Costos Operativos Fijos (OpEx) — reemplaza conceptualmente an_costos_adicionales
// del legado (user_id-scoped, nunca migrada — ver app.html:12684-12694, donde
// su suma sí se restaba de verdad en la fórmula de ganancia real). Lista
// libre de ítems (Alquiler, Sueldos, Suscripciones, etc.), cada fila
// independiente — no hay upsert por concepto, igual que el legado.

export type OperatingCost = { id: string; concepto: string; monto: number }

/** `error: true` = la lectura falló de verdad, no que la lista esté vacía porque el usuario todavía no cargó ningún costo (ver mismo criterio en finance.ts:getFinConfig). */
export async function getOperatingCosts(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ costs: OperatingCost[]; error: boolean }> {
  const { data, error } = await supabase
    .from('operating_costs')
    .select('id, concepto, monto')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })

  return { costs: data ?? [], error: !!error }
}

export async function insertOperatingCost(
  supabase: SupabaseClient,
  organizationId: string,
  params: { concepto: string; monto: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const concepto = params.concepto.trim()
  if (!concepto) return { ok: false, error: 'Ponele un nombre al costo (ej: Alquiler).' }

  const { error } = await supabase.from('operating_costs').insert({ organization_id: organizationId, concepto, monto: params.monto })
  return error ? { ok: false, error: 'No pudimos guardar el costo. Probá de nuevo.' } : { ok: true }
}

export async function deleteOperatingCost(supabase: SupabaseClient, organizationId: string, id: string): Promise<boolean> {
  const { error } = await supabase.from('operating_costs').delete().eq('organization_id', organizationId).eq('id', id)
  return !error
}
