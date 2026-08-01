import type { SupabaseClient } from '@supabase/supabase-js'

// Costo por variante, cargado a mano por el usuario — a diferencia de
// fin_config/organization_usage (legacy, sin unique constraint), esta tabla
// se creó con `unique (organization_id, tn_variant_id)` desde el vamos, así
// que un upsert con onConflict alcanza, sin el patrón manual query-then-insert.

export type ProductCost = { variantId: number; productId: number | null; productName: string | null; cost: number }

/**
 * Mapa variantId → {cost, name} para cruzar contra las órdenes (rankProducts
 * en orders.ts). `error: true` = la lectura falló de verdad, no que el
 * usuario todavía no cargó costos (mismo criterio que getFinConfig).
 */
export async function getProductCostsMap(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ costsMap: Map<number, { cost: number; name: string | null }>; error: boolean }> {
  const { data, error } = await supabase
    .from('product_costs')
    .select('tn_variant_id, product_name, cost')
    .eq('organization_id', organizationId)

  const costsMap = new Map<number, { cost: number; name: string | null }>()
  for (const row of data ?? []) {
    costsMap.set(row.tn_variant_id, { cost: row.cost, name: row.product_name })
  }
  return { costsMap, error: !!error }
}

/** Lista completa para la tabla editable de Costo de Producto. */
export async function listProductCosts(supabase: SupabaseClient, organizationId: string): Promise<ProductCost[]> {
  const { data } = await supabase
    .from('product_costs')
    .select('tn_variant_id, tn_product_id, product_name, cost')
    .eq('organization_id', organizationId)
    .order('product_name', { ascending: true })

  return (data ?? []).map((row) => ({
    variantId: row.tn_variant_id,
    productId: row.tn_product_id,
    productName: row.product_name,
    cost: row.cost,
  }))
}

export async function upsertProductCost(
  supabase: SupabaseClient,
  organizationId: string,
  params: { variantId: number; productId: number | null; productName: string | null; cost: number }
): Promise<boolean> {
  const { error } = await supabase.from('product_costs').upsert(
    {
      organization_id: organizationId,
      tn_variant_id: params.variantId,
      tn_product_id: params.productId,
      product_name: params.productName,
      cost: params.cost,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,tn_variant_id' }
  )
  return !error
}

/**
 * Aplica el mismo costo a muchas variantes de un solo saque (Gestión de
 * Costos en Lote, 2026-07-27) — un único `.upsert` con un array de filas en
 * vez de N llamadas, mismo `onConflict` que el upsert de una sola variante
 * (product_costs ya tiene `unique(organization_id, tn_variant_id)`).
 */
export async function bulkUpsertProductCosts(
  supabase: SupabaseClient,
  organizationId: string,
  items: { variantId: number; productId: number | null; productName: string | null; cost: number }[]
): Promise<boolean> {
  if (items.length === 0) return true

  const rows = items.map((item) => ({
    organization_id: organizationId,
    tn_variant_id: item.variantId,
    tn_product_id: item.productId,
    product_name: item.productName,
    cost: item.cost,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('product_costs').upsert(rows, { onConflict: 'organization_id,tn_variant_id' })
  return !error
}

export async function deleteProductCost(supabase: SupabaseClient, organizationId: string, variantId: number): Promise<boolean> {
  const { error } = await supabase
    .from('product_costs')
    .delete()
    .eq('organization_id', organizationId)
    .eq('tn_variant_id', variantId)
  return !error
}
