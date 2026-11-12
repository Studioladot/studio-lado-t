'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { insertManualSale, deleteManualSale } from '@/lib/tiendanube/sales'
import { upsertFinConfig, type FinConfig } from '@/lib/tiendanube/finance'
import { upsertProductCost, deleteProductCost, bulkUpsertProductCosts } from '@/lib/tiendanube/product-costs'
import { applyCheckoutCoupon } from '@/lib/tiendanube/checkouts'
import { insertOperatingCost, deleteOperatingCost } from '@/lib/tiendanube/operating-costs'
import { clamp, TITLE_MAX_LENGTH } from '@/lib/text-limits'
import { upsertPaymentSettings, type PaymentSettings } from '@/lib/tiendanube/payment-fees'

export async function addManualSaleAction(params: {
  fecha: string
  canal: string
  unidades: number
  monto: number
  notas: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!params.fecha) return { ok: false, error: 'Falta la fecha.' }
  if (!params.monto || params.monto <= 0) return { ok: false, error: 'El monto tiene que ser mayor a 0.' }

  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const result = await insertManualSale(supabase, {
    organizationId: activeOrganizationId,
    userId,
    ...params,
    canal: clamp(params.canal, TITLE_MAX_LENGTH),
    notas: params.notas ? clamp(params.notas, TITLE_MAX_LENGTH) : null,
  })
  if (!result.ok) return result

  revalidatePath('/operations/sales')
  return { ok: true }
}

export async function deleteManualSaleAction(id: string): Promise<void> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return

  const supabase = await createClient()
  await deleteManualSale(supabase, activeOrganizationId, id)
  revalidatePath('/operations/sales')
}

export async function saveFinConfigAction(values: FinConfig): Promise<{ ok: boolean }> {
  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false }

  const supabase = await createClient()
  const ok = await upsertFinConfig(supabase, activeOrganizationId, userId, values)
  revalidatePath('/operations/sales')
  return { ok }
}

export async function saveProductCostAction(params: {
  variantId: number
  productId: number | null
  productName: string | null
  cost: number
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!params.variantId) return { ok: false, error: 'Falta elegir un producto.' }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const ok = await upsertProductCost(supabase, activeOrganizationId, params)
  if (!ok) return { ok: false, error: 'No pudimos guardar el costo. Probá de nuevo.' }

  revalidatePath('/operations/sales')
  return { ok: true }
}

/** Gestión de Costos en Lote — aplica el mismo costo a todas las variantes seleccionadas de uno o varios productos en un solo guardado. */
export async function bulkSaveProductCostsAction(
  items: { variantId: number; productId: number | null; productName: string | null; cost: number }[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (items.length === 0) return { ok: false, error: 'No hay ninguna variante seleccionada.' }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const ok = await bulkUpsertProductCosts(supabase, activeOrganizationId, items)
  if (!ok) return { ok: false, error: 'No pudimos guardar los costos. Probá de nuevo.' }

  revalidatePath('/operations/sales')
  return { ok: true }
}

export async function deleteProductCostAction(variantId: number): Promise<void> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return

  const supabase = await createClient()
  await deleteProductCost(supabase, activeOrganizationId, variantId)
  revalidatePath('/operations/sales')
}

export async function addOperatingCostAction(params: { concepto: string; monto: number }): Promise<{ ok: true } | { ok: false; error: string }> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const result = await insertOperatingCost(supabase, activeOrganizationId, params)
  if (!result.ok) return result

  revalidatePath('/operations/sales')
  return { ok: true }
}

export async function deleteOperatingCostAction(id: string): Promise<void> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return

  const supabase = await createClient()
  await deleteOperatingCost(supabase, activeOrganizationId, id)
  revalidatePath('/operations/sales')
}

/**
 * Mismo borrado que disconnectTiendaNubeAction de (dashboard)/actions.ts,
 * pero sin el redirect a /settings/integrations — la tarjeta de conexión
 * ahora vive directo en Ventas y Operaciones, así que desconectar acá tiene
 * que quedarse en la misma página (revalidatePath alcanza).
 */
export async function disconnectTiendaNubeFromSalesAction(): Promise<void> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return

  const supabase = await createClient()
  await supabase.from('tiendanube_connections').delete().eq('organization_id', activeOrganizationId)
  revalidatePath('/operations/sales')
}

/**
 * Aplica un cupón real a un carrito abandonado real — a diferencia del resto
 * de las acciones de esta página, esto escribe contra la tienda del usuario
 * en Tienda Nube (le manda un descuento real a un cliente), no solo contra
 * Supabase. La confirmación antes de disparar esto vive en el cliente
 * (AbandonedCartsList, mismo patrón que ConfirmSubmitButton).
 */
export async function applyCheckoutCouponAction(
  checkoutId: number,
  couponId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const { data: connection } = await supabase
    .from('tiendanube_connections')
    .select('access_token, store_id')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()
  if (!connection) return { ok: false, error: 'No hay una tienda de Tienda Nube conectada.' }

  const result = await applyCheckoutCoupon(connection.access_token, connection.store_id, checkoutId, couponId)
  if (!result.ok) return result

  revalidatePath('/operations/sales')
  return { ok: true }
}

const PLANS = ['inicial', 'esencial', 'impulso', 'escala']
const RELEASE_DAYS = [1, 7, 14, 30]
const TAX_CONDITIONS = ['responsable_inscripto', 'monotributo', 'no_inscripto']

function pctOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null
}

export async function savePaymentSettingsAction(values: PaymentSettings): Promise<{ ok: boolean }> {
  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false }

  // Se valida todo de nuevo en el servidor — el cliente no es confiable.
  const installmentCosts: Record<string, number> = {}
  for (const [k, v] of Object.entries(values.installmentCosts ?? {})) {
    const n = pctOrNull(v)
    if (/^\d{1,2}$/.test(k) && n !== null && n > 0) installmentCosts[k] = n
  }
  const clean: PaymentSettings = {
    tnPlan: values.tnPlan && PLANS.includes(values.tnPlan) ? values.tnPlan : null,
    releaseDays: values.releaseDays && RELEASE_DAYS.includes(values.releaseDays) ? values.releaseDays : null,
    taxCondition: values.taxCondition && TAX_CONDITIONS.includes(values.taxCondition) ? values.taxCondition : null,
    installmentCosts,
    retencionesPct: pctOrNull(values.retencionesPct),
    otherGatewayPct: pctOrNull(values.otherGatewayPct),
  }

  const supabase = await createClient()
  const ok = await upsertPaymentSettings(supabase, activeOrganizationId, userId, clean)
  revalidatePath('/operations/sales')
  return { ok }
}
