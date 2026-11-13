import type { SupabaseClient } from '@supabase/supabase-js'
import type { TiendaNubeOrderDetail } from './orders'

// Cobros automáticos (2026-11-12) — cuánto le saca a la tienda cada venta
// según CÓMO se cobró. Tienda Nube informa en cada orden el medio de pago
// (transferencia manual, Pago Nube con tarjeta, cuotas, marca), pero NO la
// comisión cobrada ni las retenciones (eso vive solo en el panel de Pago
// Nube). Así que la comisión se calcula con las tasas oficiales del plan de
// la tienda + los datos que la tienda confirma una vez (plan, plazo de
// liberación, cuotas sin interés, retenciones).
//
// Fuentes oficiales (Centro de Ayuda de Tienda Nube, Argentina):
// - Comisiones de Pago Nube por plan y plazo: actualizado 25/09/2026.
//   La comisión es + IVA y se calcula sobre el total de la orden con envío.
// - Costo por transacción de Tienda Nube (ventas que NO son con Pago Nube):
//   actualizado 25/03/2026. Con Pago Nube es 0%.
// Si Tienda Nube cambia sus tasas, se actualizan acá y nada más.

export type TnPlan = 'inicial' | 'esencial' | 'impulso' | 'escala'
export type ReleaseDays = 1 | 7 | 14 | 30
export type TaxCondition = 'responsable_inscripto' | 'monotributo' | 'no_inscripto'

export const TN_PLAN_LABEL: Record<TnPlan, string> = {
  inicial: 'Inicial',
  esencial: 'Esencial',
  impulso: 'Impulso',
  escala: 'Escala',
}

export const TAX_CONDITION_LABEL: Record<TaxCondition, string> = {
  responsable_inscripto: 'Responsable inscripto',
  monotributo: 'Monotributo',
  no_inscripto: 'No inscripto',
}

/** Pago Nube — tarjetas de crédito, débito y MODO, % + IVA, por plazo de liberación. */
const PAGO_NUBE_CARD_PCT: Record<TnPlan, Record<ReleaseDays, number>> = {
  inicial: { 1: 6.4, 7: 4.45, 14: 3.5, 30: 2.99 },
  esencial: { 1: 6.09, 7: 4.39, 14: 3.49, 30: 2.97 },
  impulso: { 1: 5.89, 7: 4.19, 14: 3.29, 30: 2.85 },
  escala: { 1: 5.59, 7: 3.89, 14: 2.99, 30: 2.65 },
}

/** Pago Nube — transferencia, % + IVA. */
const PAGO_NUBE_TRANSFER_PCT: Record<TnPlan, number> = {
  inicial: 1.5,
  esencial: 1.5,
  impulso: 0.99,
  escala: 0.85,
}

/** Costo por transacción de Tienda Nube en ventas que no son con Pago Nube. El plan Inicial solo permite cobrar con Pago Nube. */
const TN_TRANSACTION_PCT: Record<TnPlan, number> = {
  inicial: 0,
  esencial: 2,
  impulso: 1,
  escala: 0.7,
}

const IVA_PCT = 21
/** No inscriptos ante ARCA: Pago Nube retiene 10,5% sobre el total de cada venta (en vez del IVA sobre la comisión). */
const NO_INSCRIPTO_PCT = 10.5

export type PaymentSettings = {
  tnPlan: TnPlan | null
  releaseDays: ReleaseDays | null
  taxCondition: TaxCondition | null
  /** % que absorbe la tienda por cantidad de cuotas sin interés ("3" → 10.2). Sin entrada = esas cuotas las paga el cliente. */
  installmentCosts: Record<string, number>
  retencionesPct: number | null
  otherGatewayPct: number | null
}

export const EMPTY_PAYMENT_SETTINGS: PaymentSettings = {
  tnPlan: null,
  releaseDays: null,
  taxCondition: null,
  installmentCosts: {},
  retencionesPct: null,
  otherGatewayPct: null,
}

export async function getPaymentSettings(supabase: SupabaseClient, organizationId: string): Promise<PaymentSettings> {
  const { data } = await supabase
    .from('payment_fee_settings')
    .select('tn_plan, pago_nube_release_days, tax_condition, installment_costs, retenciones_pct, other_gateway_pct')
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (!data) return EMPTY_PAYMENT_SETTINGS
  const rawCosts = (data.installment_costs ?? {}) as Record<string, unknown>
  const installmentCosts: Record<string, number> = {}
  for (const [k, v] of Object.entries(rawCosts)) {
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) installmentCosts[k] = n
  }
  return {
    tnPlan: (data.tn_plan as TnPlan | null) ?? null,
    releaseDays: (data.pago_nube_release_days as ReleaseDays | null) ?? null,
    taxCondition: (data.tax_condition as TaxCondition | null) ?? null,
    installmentCosts,
    retencionesPct: data.retenciones_pct === null ? null : Number(data.retenciones_pct),
    otherGatewayPct: data.other_gateway_pct === null ? null : Number(data.other_gateway_pct),
  }
}

export async function upsertPaymentSettings(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  s: PaymentSettings
): Promise<boolean> {
  const { error } = await supabase.from('payment_fee_settings').upsert(
    {
      organization_id: organizationId,
      tn_plan: s.tnPlan,
      pago_nube_release_days: s.releaseDays,
      tax_condition: s.taxCondition,
      installment_costs: s.installmentCosts,
      retenciones_pct: s.retencionesPct,
      other_gateway_pct: s.otherGatewayPct,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: 'organization_id' }
  )
  if (error) console.error('[payment-fees] guardar configuración falló', error)
  return !error
}

// ---------------------------------------------------------------------------
// Automático para todas las cuentas (2026-11-13)
// ---------------------------------------------------------------------------
// Lo que la tienda deja vacío en "Cómo cobrás" se completa solo:
// - Plan: se lee de Tienda Nube (GET /store → plan_name). Así cada cuenta
//   conectada usa las tasas de SU plan sin que nadie cargue nada.
// - Plazo de Pago Nube y situación ante ARCA: Tienda Nube no los informa
//   (Pago Nube no tiene API pública de comisiones), así que se usa el valor
//   estándar. Si la tienda lo cambia en Pago Nube, lo corrige en Cómo cobrás.

/** Códigos de plan que devuelve Tienda Nube. Verificado: AR-plan-B = Impulso (El Palacio, 2026-11-12). El resto sigue el mismo orden de la grilla de planes. */
const TN_PLAN_CODES: Record<string, TnPlan> = {
  'ar-plan-free': 'inicial',
  'ar-plan-0': 'inicial',
  'ar-plan-inicial': 'inicial',
  'ar-plan-a': 'esencial',
  'ar-plan-esencial': 'esencial',
  'ar-plan-b': 'impulso',
  'ar-plan-impulso': 'impulso',
  'ar-plan-c': 'escala',
  'ar-plan-escala': 'escala',
}

export function planFromTiendaNube(planName: string | null | undefined): TnPlan | null {
  if (!planName) return null
  const key = planName.trim().toLowerCase()
  if (TN_PLAN_CODES[key]) return TN_PLAN_CODES[key]
  for (const plan of ['inicial', 'esencial', 'impulso', 'escala'] as TnPlan[]) if (key.includes(plan)) return plan
  return null
}

/** Plan de la tienda según Tienda Nube. null si no se pudo leer. */
export async function getTiendaNubePlan(accessToken: string, storeId: string | number): Promise<TnPlan | null> {
  try {
    const res = await fetch(`https://api.tiendanube.com/v1/${storeId}/store?fields=plan_name`, {
      headers: { Authentication: `bearer ${accessToken}`, 'User-Agent': 'GOTIX (contacto@gotix.app)' },
      next: { revalidate: 21600 },
    })
    if (!res.ok) return null
    const store = (await res.json()) as { plan_name?: string }
    return planFromTiendaNube(store.plan_name)
  } catch (err) {
    console.error('[payment-fees] no se pudo leer el plan de Tienda Nube', err)
    return null
  }
}

export const DEFAULT_RELEASE_DAYS: ReleaseDays = 14
export const DEFAULT_TAX_CONDITION: TaxCondition = 'responsable_inscripto'

export type SettingSource = 'tienda' | 'tiendanube' | 'estandar' | 'falta'

export type AutoPaymentSettings = {
  /** Lo que se usa para calcular: lo guardado por la tienda, o lo automático. */
  effective: PaymentSettings
  /** De dónde salió cada dato, para mostrarlo en Cómo cobrás. */
  sources: { tnPlan: SettingSource; releaseDays: SettingSource; taxCondition: SettingSource }
  detectedPlan: TnPlan | null
}

/** Lo que necesita la tarjeta Cómo cobrás: lo guardado + de dónde sale cada valor automático. */
export type PaymentSettingsView = { saved: PaymentSettings; sources: AutoPaymentSettings['sources']; detectedPlan: TnPlan | null }

export function resolvePaymentSettings(saved: PaymentSettings, detectedPlan: TnPlan | null): AutoPaymentSettings {
  const tnPlan = saved.tnPlan ?? detectedPlan
  return {
    effective: {
      ...saved,
      tnPlan,
      releaseDays: saved.releaseDays ?? DEFAULT_RELEASE_DAYS,
      taxCondition: saved.taxCondition ?? DEFAULT_TAX_CONDITION,
    },
    sources: {
      tnPlan: saved.tnPlan ? 'tienda' : detectedPlan ? 'tiendanube' : 'falta',
      releaseDays: saved.releaseDays ? 'tienda' : 'estandar',
      taxCondition: saved.taxCondition ? 'tienda' : 'estandar',
    },
    detectedPlan,
  }
}

// ---------------------------------------------------------------------------
// Clasificación del cobro
// ---------------------------------------------------------------------------

export type PaymentChannel = 'transferencia_manual' | 'pago_nube_tarjeta' | 'pago_nube_transferencia' | 'mercado_pago' | 'otra_pasarela'

export const CHANNEL_LABEL: Record<PaymentChannel, string> = {
  transferencia_manual: 'Transferencia / efectivo (fuera de Pago Nube)',
  pago_nube_tarjeta: 'Pago Nube con tarjeta',
  pago_nube_transferencia: 'Pago Nube con transferencia',
  mercado_pago: 'Mercado Pago',
  otra_pasarela: 'Otra pasarela',
}

const CARD_BRAND_LABEL: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  american_express: 'American Express',
  naranja: 'Naranja',
  cabal: 'Cabal',
  maestro: 'Maestro',
}

export function classifyPayment(order: TiendaNubeOrderDetail): { channel: PaymentChannel; label: string; installments: number } {
  const gateway = (order.gateway ?? '').toLowerCase()
  const method = (order.paymentMethod ?? '').toLowerCase()
  const installments = order.installments && order.installments > 1 ? order.installments : 1

  if (!gateway || gateway === 'offline') {
    return { channel: 'transferencia_manual', label: order.gatewayName || 'Transferencia', installments: 1 }
  }
  if (gateway.includes('pago-nube') || gateway.includes('nuvem')) {
    if (method.includes('transfer') || method.includes('debin') || method.includes('pix')) {
      return { channel: 'pago_nube_transferencia', label: 'Pago Nube · transferencia', installments: 1 }
    }
    const brand = order.cardBrand ? CARD_BRAND_LABEL[order.cardBrand.toLowerCase()] ?? order.cardBrand : null
    const kind = method.includes('debit') ? 'débito' : method.includes('credit') ? 'crédito' : 'tarjeta'
    const cuotas = installments > 1 ? ` · ${installments} cuotas` : ' · 1 pago'
    return { channel: 'pago_nube_tarjeta', label: `Pago Nube · ${brand ? `${brand} ` : ''}${kind}${cuotas}`, installments }
  }
  if (gateway.includes('mercadopago') || gateway.includes('mercado-pago')) {
    return { channel: 'mercado_pago', label: `Mercado Pago${installments > 1 ? ` · ${installments} cuotas` : ''}`, installments }
  }
  return { channel: 'otra_pasarela', label: order.gatewayName || gateway, installments }
}

// ---------------------------------------------------------------------------
// Cálculo por orden
// ---------------------------------------------------------------------------

export type OrderFees = {
  channel: PaymentChannel
  /** Cómo se cobró, en castellano: "Pago Nube · Visa crédito · 6 cuotas". */
  medio: string
  installments: number
  /** Total cobrado al cliente (con envío) — base de las comisiones. */
  total: number
  /** Comisión de la pasarela, sin IVA. */
  comisionPasarela: number
  /** Costo de las cuotas sin interés que absorbe la tienda, sin IVA. */
  costoCuotas: number
  /** IVA sobre comisión + cuotas (o 10,5% sobre el total para no inscriptos). */
  ivaComisiones: number
  /** Costo por transacción de Tienda Nube (ventas que no son con Pago Nube). */
  costoTransaccionTn: number
  /** Retenciones de Ingresos Brutos (a cuenta del impuesto, no es comisión). */
  retenciones: number
  /** Comisiones que no vuelven: pasarela + cuotas + IVA + Tienda Nube. */
  comisiones: number
  /** Lo que llega a la cuenta: total − comisiones − retenciones. */
  teDepositan: number
  /** Tasas usadas, para explicar el número. */
  tasas: { pasarelaPct: number; cuotasPct: number; ivaPct: number; tnPct: number; retencionesPct: number }
  /** Datos que faltan para que el cálculo sea completo (vacío = completo). */
  faltantes: string[]
}

export type LegacyRates = { comisionTnPct: number | null; pasarelaPct: number | null }

export function computeOrderFees(order: TiendaNubeOrderDetail, s: PaymentSettings, legacy: LegacyRates): OrderFees {
  const { channel, label, installments } = classifyPayment(order)
  const total = order.total
  const faltantes: string[] = []
  const plan = s.tnPlan

  let pasarelaPct = 0
  let cuotasPct = 0
  let tnPct = 0
  let retencionesPct = 0

  if (!plan) {
    // Sin plan confirmado: si hay % cargados a mano del esquema anterior se
    // respetan; si no, se avisa en vez de inventar una tasa.
    faltantes.push('el plan de Tienda Nube')
    if (channel === 'transferencia_manual' || channel === 'mercado_pago' || channel === 'otra_pasarela') tnPct = legacy.comisionTnPct ?? 0
    if (channel !== 'transferencia_manual') pasarelaPct = legacy.pasarelaPct ?? 0
  } else {
    if (channel === 'pago_nube_tarjeta') {
      if (s.releaseDays) pasarelaPct = PAGO_NUBE_CARD_PCT[plan][s.releaseDays]
      else faltantes.push('el plazo de liberación de Pago Nube')
    } else if (channel === 'pago_nube_transferencia') {
      pasarelaPct = PAGO_NUBE_TRANSFER_PCT[plan]
    } else {
      tnPct = TN_TRANSACTION_PCT[plan]
      if (channel !== 'transferencia_manual') {
        if (s.otherGatewayPct !== null) pasarelaPct = s.otherGatewayPct
        else faltantes.push('la comisión de la otra pasarela')
      }
    }
  }

  if ((channel === 'pago_nube_tarjeta' || channel === 'mercado_pago') && installments > 1) {
    const cost = s.installmentCosts[String(installments)]
    if (cost !== undefined) cuotasPct = cost
  }

  if (channel === 'pago_nube_tarjeta' || channel === 'pago_nube_transferencia') {
    retencionesPct = s.retencionesPct ?? 0
  }

  const comisionPasarela = (total * pasarelaPct) / 100
  const costoCuotas = (total * cuotasPct) / 100
  const isGateway = channel !== 'transferencia_manual'
  const ivaPct = s.taxCondition === 'no_inscripto' ? 0 : IVA_PCT
  const ivaComisiones =
    s.taxCondition === 'no_inscripto' && isGateway ? (total * NO_INSCRIPTO_PCT) / 100 : ((comisionPasarela + costoCuotas) * ivaPct) / 100
  const costoTransaccionTn = (total * tnPct) / 100
  const retenciones = (total * retencionesPct) / 100
  const comisiones = comisionPasarela + costoCuotas + ivaComisiones + costoTransaccionTn

  return {
    channel,
    medio: label,
    installments,
    total,
    comisionPasarela,
    costoCuotas,
    ivaComisiones,
    costoTransaccionTn,
    retenciones,
    comisiones,
    teDepositan: total - comisiones - retenciones,
    tasas: { pasarelaPct, cuotasPct, ivaPct: s.taxCondition === 'no_inscripto' ? NO_INSCRIPTO_PCT : ivaPct, tnPct, retencionesPct },
    faltantes,
  }
}

// ---------------------------------------------------------------------------
// Resumen por medio de pago
// ---------------------------------------------------------------------------

export type ChannelSummary = {
  channel: PaymentChannel
  label: string
  ordenes: number
  facturacion: number
  comisiones: number
  retenciones: number
  teDepositan: number
  /** Qué parte de lo cobrado llega a la cuenta. */
  quedaPct: number
  /** Comisiones ÷ facturación. */
  comisionPct: number
}

export function summarizeByChannel(fees: OrderFees[]): ChannelSummary[] {
  const byChannel = new Map<PaymentChannel, ChannelSummary>()
  for (const f of fees) {
    const row =
      byChannel.get(f.channel) ??
      ({ channel: f.channel, label: CHANNEL_LABEL[f.channel], ordenes: 0, facturacion: 0, comisiones: 0, retenciones: 0, teDepositan: 0, quedaPct: 0, comisionPct: 0 } as ChannelSummary)
    row.ordenes += 1
    row.facturacion += f.total
    row.comisiones += f.comisiones
    row.retenciones += f.retenciones
    row.teDepositan += f.teDepositan
    byChannel.set(f.channel, row)
  }
  return Array.from(byChannel.values())
    .map((r) => ({
      ...r,
      facturacion: Math.round(r.facturacion),
      comisiones: Math.round(r.comisiones),
      retenciones: Math.round(r.retenciones),
      teDepositan: Math.round(r.teDepositan),
      quedaPct: r.facturacion > 0 ? (r.teDepositan / r.facturacion) * 100 : 0,
      comisionPct: r.facturacion > 0 ? (r.comisiones / r.facturacion) * 100 : 0,
    }))
    .sort((a, b) => b.facturacion - a.facturacion)
}

/** Tabla de tasas que resultan de la configuración, para mostrarle a la tienda cómo se calcula cada venta. */
export function describeRates(s: PaymentSettings): { medio: string; tasa: string }[] {
  if (!s.tnPlan) return []
  const iva = s.taxCondition === 'no_inscripto' ? ' (+10,5% sobre el total por no inscripto)' : ' + IVA'
  const fmt = (n: number) => `${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`
  const rows: { medio: string; tasa: string }[] = []
  const tn = TN_TRANSACTION_PCT[s.tnPlan]
  rows.push({ medio: 'Transferencia o efectivo fuera de Pago Nube', tasa: tn > 0 ? `${fmt(tn)} de Tienda Nube` : 'Sin costo' })
  if (s.releaseDays) {
    const card = PAGO_NUBE_CARD_PCT[s.tnPlan][s.releaseDays]
    const withIva = s.taxCondition === 'no_inscripto' ? card : card * 1.21
    rows.push({
      medio: `Pago Nube con tarjeta (cobro a ${s.releaseDays} ${s.releaseDays === 1 ? 'día' : 'días'})`,
      tasa: `${fmt(card)}${iva}${s.taxCondition === 'no_inscripto' ? '' : ` = ${fmt(withIva)}`}`,
    })
  }
  const tr = PAGO_NUBE_TRANSFER_PCT[s.tnPlan]
  rows.push({ medio: 'Pago Nube con transferencia', tasa: `${fmt(tr)}${iva}` })
  for (const [n, pct] of Object.entries(s.installmentCosts).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    rows.push({ medio: `${n} cuotas sin interés (además de la comisión)`, tasa: `${fmt(pct)}${iva}` })
  }
  if (s.retencionesPct) rows.push({ medio: 'Retenciones de Ingresos Brutos (Pago Nube)', tasa: `${fmt(s.retencionesPct)} a cuenta del impuesto` })
  return rows
}
