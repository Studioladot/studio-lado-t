import type { SupabaseClient } from '@supabase/supabase-js'

// Venta manual/showroom — se fusiona con las órdenes reales de Tienda Nube
// en una sola vista "Ventas Consolidadas" (app.html: renderConsolidatedSales)
// en operations/tiendanube/tiendanube-workspace.tsx, no son dos listas separadas.

export type ManualSale = {
  id: string
  fecha: string
  canal: string | null
  unidades: number | null
  monto: number | null
  costoUnitario: number | null
  notas: string | null
}

export async function getManualSales(supabase: SupabaseClient, organizationId: string, limit = 50): Promise<ManualSale[]> {
  const { data } = await supabase
    .from('daily_sales')
    .select('id, fecha, canal, unidades, monto, costo_unitario, notas')
    .eq('organization_id', organizationId)
    .order('fecha', { ascending: false })
    .limit(limit)

  return (data ?? []).map((row) => ({
    id: row.id,
    fecha: row.fecha,
    canal: row.canal,
    unidades: row.unidades,
    monto: row.monto,
    costoUnitario: row.costo_unitario,
    notas: row.notas,
  }))
}

export async function insertManualSale(
  supabase: SupabaseClient,
  params: { organizationId: string; userId: string; fecha: string; canal: string; unidades: number; monto: number; notas: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from('daily_sales').insert({
    organization_id: params.organizationId,
    user_id: params.userId,
    fecha: params.fecha,
    canal: params.canal,
    unidades: params.unidades,
    monto: params.monto,
    notas: params.notas,
  })
  return error ? { ok: false, error: 'No pudimos guardar la venta. Probá de nuevo.' } : { ok: true }
}

export async function deleteManualSale(supabase: SupabaseClient, organizationId: string, id: string): Promise<boolean> {
  const { error } = await supabase.from('daily_sales').delete().eq('organization_id', organizationId).eq('id', id)
  return !error
}
