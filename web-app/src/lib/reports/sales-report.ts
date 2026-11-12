import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getTiendaNubeOrders,
  summarizeOrders,
  groupOrdersByDay,
  rankProducts,
  buildOrderLedger,
  sumUnitsSold,
  computeCustomerEconomics,
  sumShippingCost,
  sumGatewayGross,
} from '@/lib/tiendanube/orders'
import { getTiendaNubeProducts } from '@/lib/tiendanube/products'
import { getTiendaNubeCheckouts, summarizeCheckouts, getRecentAbandonedCheckouts } from '@/lib/tiendanube/checkouts'
import { getTiendaNubeCoupons } from '@/lib/tiendanube/coupons'
import { getManualSales } from '@/lib/tiendanube/sales'
import { getFinConfig, computeProfitWaterfall } from '@/lib/tiendanube/finance'
import { getProductCostsMap, listProductCosts } from '@/lib/tiendanube/product-costs'
import { getOperatingCosts } from '@/lib/tiendanube/operating-costs'
import { getMetaAccountSpendForRange } from '@/lib/meta/campaigns'
import { getUsdArsRate, convertAmount, type Currency } from '@/lib/currency'
import { generateInsights } from '@/lib/tiendanube/insights'

// Rentabilidad Neta de una organización en un período — única fuente de los
// números de /operations/sales y de la conexión de Claude (api/mcp). Si una
// fórmula cambia acá, cambia en los dos lados a la vez: nunca puede pasar
// que Claude diga un número y la pantalla otro.

const DEFAULT_DAYS = 30

/**
 * Rango activo — presets (`days=N`, 1 a 90) o rango personalizado
 * (`from`/`to`, YYYY-MM-DD). Los fetchers reciben `since`/`until` ya
 * resueltos, ninguno recalcula fechas por su cuenta.
 */
export function resolvePeriod(daysParam: string | undefined, fromParam: string | undefined, toParam: string | undefined) {
  const now = new Date()

  if (fromParam && toParam) {
    const from = new Date(fromParam)
    const to = new Date(toParam)
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
      to.setHours(23, 59, 59, 999)
      return { periodStart: from, periodEnd: to, activePreset: null, customFrom: fromParam, customTo: toParam }
    }
  }

  const days = daysParam ? Math.max(1, Math.min(90, Number(daysParam) || DEFAULT_DAYS)) : DEFAULT_DAYS
  const periodStart = new Date(now)
  periodStart.setDate(periodStart.getDate() - days)
  return { periodStart, periodEnd: now, activePreset: days, customFrom: null, customTo: null }
}

export async function buildSalesReport(supabase: SupabaseClient, organizationId: string, periodStart: Date, periodEnd: Date) {
  const [{ data: tnConnection }, { data: metaConnection }, manualSales, finConfigResult, productCostsResult, costsList, operatingCostsResult] =
    await Promise.all([
      supabase
        .from('tiendanube_connections')
        .select('access_token, store_id, store_name')
        .eq('organization_id', organizationId)
        .maybeSingle(),
      supabase
        .from('meta_connections')
        .select('token, account_id, account_currency, expires_at')
        .eq('organization_id', organizationId)
        .maybeSingle(),
      getManualSales(supabase, organizationId),
      getFinConfig(supabase, organizationId),
      getProductCostsMap(supabase, organizationId),
      listProductCosts(supabase, organizationId),
      getOperatingCosts(supabase, organizationId),
    ])

  const finConfig = finConfigResult.config
  const costsMap = productCostsResult.costsMap
  const operatingCosts = operatingCostsResult.costs
  // Falla real de lectura (no "todavía no configuró nada") en cualquiera de
  // los 3 — antes se tragaba en silencio y la Cascada mostraba costos en
  // $0 sin ningún aviso, indistinguible de una cuenta nueva sin configurar.
  const costsLoadError = finConfigResult.error || productCostsResult.error || operatingCostsResult.error

  const tokenExpired = metaConnection?.expires_at ? new Date(metaConnection.expires_at) < new Date() : false
  const metaUsable = !!metaConnection && !tokenExpired

  // Período anterior: mismo largo que el activo, inmediatamente antes —
  // simétrico sea preset o rango personalizado.
  const periodLengthMs = periodEnd.getTime() - periodStart.getTime()
  const previousStart = new Date(periodStart.getTime() - periodLengthMs)
  const periodStartISO = periodStart.toISOString()

  // Costos Fijos (OpEx) — se cargan como total MENSUAL y se prorratean al
  // largo del período activo. El período anterior tiene el mismo largo por
  // construcción, así que el prorrateo es idéntico para ambos.
  const opexMonthlyTotal = operatingCosts.reduce((sum, c) => sum + c.monto, 0)
  const periodLengthDays = periodLengthMs / 86400000
  const opexProrated = Math.round(opexMonthlyTotal * (periodLengthDays / 30))

  const [ordersResult, catalogResult, checkoutsResult, couponsResult, usdArsRate, metaCurrentResult, metaPreviousResult] = await Promise.all([
    tnConnection ? getTiendaNubeOrders(tnConnection.access_token, tnConnection.store_id, previousStart, periodEnd) : Promise.resolve(null),
    tnConnection ? getTiendaNubeProducts(tnConnection.access_token, tnConnection.store_id) : Promise.resolve(null),
    tnConnection ? getTiendaNubeCheckouts(tnConnection.access_token, tnConnection.store_id, periodStart, periodEnd) : Promise.resolve(null),
    tnConnection ? getTiendaNubeCoupons(tnConnection.access_token, tnConnection.store_id) : Promise.resolve(null),
    getUsdArsRate(),
    metaUsable ? getMetaAccountSpendForRange(metaConnection.token, metaConnection.account_id, periodStart, periodEnd) : Promise.resolve(null),
    metaUsable
      ? getMetaAccountSpendForRange(metaConnection.token, metaConnection.account_id, previousStart, periodStart)
      : Promise.resolve(null),
  ])

  const tnConnected = !!tnConnection
  const tnError = ordersResult && !ordersResult.ok ? ordersResult.error : null
  const allOrders = ordersResult?.ok ? ordersResult.orders : []
  const currentOrders = allOrders.filter((o) => o.createdAt >= periodStartISO)
  const previousOrders = allOrders.filter((o) => o.createdAt < periodStartISO)
  // Tope real de paginación (20 páginas × 200 = 4000 filas).
  const ordersTruncated = ordersResult?.ok ? ordersResult.truncated : false

  const catalog = catalogResult?.ok ? catalogResult.variants : []
  const catalogError = catalogResult && !catalogResult.ok ? catalogResult.error : null

  const checkoutError = checkoutsResult && !checkoutsResult.ok ? checkoutsResult.error : null
  const checkoutsTruncated = checkoutsResult?.ok ? checkoutsResult.truncated : false
  const allCheckouts = checkoutsResult?.ok ? checkoutsResult.checkouts : []
  const currentCheckouts = allCheckouts.filter((c) => c.createdAt >= periodStartISO)
  const summary = summarizeOrders(currentOrders)
  const previousSummary = summarizeOrders(previousOrders)
  const checkoutFunnel = summarizeCheckouts(currentCheckouts, summary.ordenes)
  const abandonedCheckouts = getRecentAbandonedCheckouts(currentCheckouts, 10)
  const coupons = couponsResult?.ok ? couponsResult.coupons : []
  const dailyData = groupOrdersByDay(currentOrders)
  const ranking = rankProducts(currentOrders, costsMap, catalog)
  const previousRanking = rankProducts(previousOrders, costsMap, catalog)

  // Gasto de Meta viene en la moneda de la cuenta publicitaria — Tienda Nube
  // siempre en la moneda local. Se convierte a ARS para restarlo en la misma
  // cascada; sin cotización se usa sin convertir y se avisa.
  const accountCurrency: Currency = metaConnection?.account_currency === 'ARS' ? 'ARS' : 'USD'
  const currencyMismatchNoRate = metaUsable && accountCurrency !== 'ARS' && usdArsRate === null

  function toArs(amount: number) {
    return convertAmount(amount, accountCurrency, 'ARS', usdArsRate)
  }

  const metaSpendArs = metaCurrentResult?.ok ? toArs(metaCurrentResult.spend.spend) : 0
  const metaSpendPreviousArs = metaPreviousResult?.ok ? toArs(metaPreviousResult.spend.spend) : 0
  const hasMetaSpend = metaSpendArs > 0
  const metaError = metaCurrentResult && !metaCurrentResult.ok ? metaCurrentResult.error : null

  // Radiografía de la Orden: "CPA prorrateado" = gasto de Meta del período /
  // órdenes del período, repartido igual en cada fila.
  const ledger = buildOrderLedger(
    currentOrders,
    costsMap,
    {
      comisionTnPct: finConfig.comisionTnPct ?? 0,
      comisionPasarelaPct: finConfig.pasarelaPct ?? 0,
      impuestosPct: finConfig.impuestosPct ?? 0,
    },
    metaSpendArs,
    opexProrated,
    finConfig.costoEnvioPromedio ?? null
  )

  // Envío real: si hay un costo promedio cargado a mano se usa ese; si no,
  // lo que Tienda Nube informa como costo del envío para la tienda
  // (`shipping_cost_owner`), que incluye el envío gratis/bonificado.
  const envioReal = finConfig.costoEnvioPromedio ? Math.round(finConfig.costoEnvioPromedio * summary.ordenes) : sumShippingCost(currentOrders)
  const envioRealPrevious = finConfig.costoEnvioPromedio
    ? Math.round(finConfig.costoEnvioPromedio * previousSummary.ordenes)
    : sumShippingCost(previousOrders)

  // La comisión de pasarela solo la pagan las órdenes cobradas por pasarela
  // (Pago Nube, Mercado Pago, tarjeta) — las transferencias no.
  const gatewayGross = sumGatewayGross(currentOrders)
  const gatewayGrossPrevious = sumGatewayGross(previousOrders)

  const waterfall = computeProfitWaterfall({
    bruto: summary.bruto,
    cogs: ranking.totalCogs,
    metaSpend: metaSpendArs,
    envio: envioReal,
    comisionTn: finConfig.comisionTnPct ? Math.round((summary.bruto * finConfig.comisionTnPct) / 100) : 0,
    comisionPasarela: finConfig.pasarelaPct ? Math.round((gatewayGross * finConfig.pasarelaPct) / 100) : 0,
    impuestos: finConfig.impuestosPct ? Math.round((summary.bruto * finConfig.impuestosPct) / 100) : 0,
    opex: opexProrated,
  })

  const previousWaterfall = computeProfitWaterfall({
    bruto: previousSummary.bruto,
    cogs: previousRanking.totalCogs,
    metaSpend: metaSpendPreviousArs,
    envio: envioRealPrevious,
    comisionTn: finConfig.comisionTnPct ? Math.round((previousSummary.bruto * finConfig.comisionTnPct) / 100) : 0,
    comisionPasarela: finConfig.pasarelaPct ? Math.round((gatewayGrossPrevious * finConfig.pasarelaPct) / 100) : 0,
    impuestos: finConfig.impuestosPct ? Math.round((previousSummary.bruto * finConfig.impuestosPct) / 100) : 0,
    opex: opexProrated,
  })

  const roasReal = metaSpendArs > 0 ? waterfall.neto / metaSpendArs : 0
  const roasMeta =
    metaCurrentResult?.ok && metaCurrentResult.spend.spend > 0 ? metaCurrentResult.spend.revenue / metaCurrentResult.spend.spend : 0
  const cpaReal = summary.ordenes > 0 ? (metaSpendArs + ranking.totalCogs + envioReal) / summary.ordenes : 0
  const cpaPrevious =
    previousSummary.ordenes > 0
      ? (metaSpendPreviousArs + previousRanking.totalCogs + envioRealPrevious) / previousSummary.ordenes
      : null
  const aov = summary.ordenes > 0 ? summary.bruto / summary.ordenes : 0
  const aovPrevious = previousSummary.ordenes > 0 ? previousSummary.bruto / previousSummary.ordenes : null

  const mer = metaSpendArs > 0 ? summary.bruto / metaSpendArs : 0
  const margenPct = summary.bruto > 0 ? (waterfall.neto / summary.bruto) * 100 : 0
  const roasPrevious = metaSpendPreviousArs > 0 ? previousWaterfall.neto / metaSpendPreviousArs : null
  const merPrevious = metaSpendPreviousArs > 0 ? previousSummary.bruto / metaSpendPreviousArs : null
  const margenPctPrevious = previousSummary.bruto > 0 ? (previousWaterfall.neto / previousSummary.bruto) * 100 : null

  // % de cambio vs. período anterior — null cuando no hay base real de
  // comparación (período anterior en 0), nunca se inventa un delta.
  function pctDelta(current: number, previous: number | null): number | null {
    if (previous === null || previous === 0) return null
    return ((current - previous) / Math.abs(previous)) * 100
  }

  const trends = {
    bruto: pctDelta(summary.bruto, previousSummary.bruto || null),
    neto: pctDelta(waterfall.neto, previousWaterfall.neto || null),
    margenPct: pctDelta(margenPct, margenPctPrevious),
    roas: pctDelta(roasReal, roasPrevious),
    mer: pctDelta(mer, merPrevious),
    cpa: pctDelta(cpaReal, cpaPrevious),
    aov: pctDelta(aov, aovPrevious),
    ordenes: pctDelta(summary.ordenes, previousSummary.ordenes || null),
    // Tienda Nube no conserva los carritos abandonados viejos, así que el
    // período anterior siempre trae menos: sin base confiable, sin tendencia.
    carritosCreados: null,
    abandonados: null,
    conversion: null,
  }

  const series = {
    bruto: dailyData.map((d) => d.bruto),
    neto: dailyData.map((d) => d.neto),
    aov: dailyData.map((d) => (d.ordenes > 0 ? d.bruto / d.ordenes : 0)),
    ordenes: dailyData.map((d) => d.ordenes),
  }

  const insights = generateInsights({
    roasMeta,
    roasReal,
    cpaCurrent: cpaReal,
    cpaPrevious,
    aovCurrent: aov,
    aovPrevious,
    tiedUpCapital: ranking.totalTiedUpCapital,
    checkoutFunnel,
  })

  const funnelSteps = metaCurrentResult?.ok
    ? [
        { label: 'Impresiones', value: metaCurrentResult.spend.impressions },
        { label: 'Clics', value: metaCurrentResult.spend.linkClicks },
        { label: 'Agregado al carrito', value: metaCurrentResult.spend.addToCart },
        { label: 'Checkout iniciado', value: metaCurrentResult.spend.initiateCheckout },
        { label: 'Compra', value: metaCurrentResult.spend.purchases },
      ]
    : []

  // Cobertura de costos: qué parte de lo vendido tiene costo de producto
  // cargado. Sin esto, Margen Neto/Ganancia/ROAS Real salen inflados.
  let unitsWithCost = 0
  let totalUnits = 0
  const variantsWithoutCost = new Set<number>()
  for (const order of currentOrders) {
    for (const item of order.lineItems) {
      totalUnits += item.quantity
      const cost = item.variantId !== null ? costsMap.get(item.variantId)?.cost ?? 0 : 0
      if (cost > 0) unitsWithCost += item.quantity
      else if (item.variantId !== null) variantsWithoutCost.add(item.variantId)
    }
  }
  const missingSetup = {
    costCoveragePct: totalUnits > 0 ? (unitsWithCost / totalUnits) * 100 : 100,
    variantsWithoutCost: variantsWithoutCost.size,
    noCommissions: finConfig.comisionTnPct === null && finConfig.pasarelaPct === null,
    noTaxes: finConfig.impuestosPct === null,
  }
  const gatewaySharePct = summary.bruto > 0 ? (gatewayGross / summary.bruto) * 100 : 0

  const manualTotal = manualSales.reduce((sum, s) => sum + (s.monto ?? 0), 0)

  // Economía Unitaria — CAC/LTV/Recompra/Frecuencia sobre los mismos datos.
  const customerEconomics = computeCustomerEconomics(currentOrders)
  const unidadesVendidas = sumUnitsSold(currentOrders)
  const margenBrutoPct = summary.bruto > 0 ? ((summary.bruto - ranking.totalCogs) / summary.bruto) * 100 : 0
  const costoPromedioPorPedido =
    summary.ordenes > 0 ? (ranking.totalCogs + envioReal + waterfall.comisionTn + waterfall.comisionPasarela + waterfall.impuestos) / summary.ordenes : 0

  // CAC = gasto de Meta / clientes distintos del período — no distingue
  // nuevos de recurrentes, así que es "costo por cliente activo".
  const cac = metaSpendArs > 0 && customerEconomics.totalCustomers > 0 ? metaSpendArs / customerEconomics.totalCustomers : null
  const cacBlended =
    customerEconomics.totalCustomers > 0 ? (metaSpendArs + opexProrated) / customerEconomics.totalCustomers : null
  const avgGrossMarginPerCustomer =
    customerEconomics.avgRevenuePerCustomer !== null ? customerEconomics.avgRevenuePerCustomer * (margenBrutoPct / 100) : null
  const ratioMargenBrutoCac = cac !== null && cac > 0 && avgGrossMarginPerCustomer !== null ? avgGrossMarginPerCustomer / cac : null
  const ratioLtvCac = cac !== null && cac > 0 && customerEconomics.avgRevenuePerCustomer !== null ? customerEconomics.avgRevenuePerCustomer / cac : null

  const unitEconomics = {
    impuestosPct: finConfig.impuestosPct,
    // Sin ningún costo cargado el margen bruto daría 100% — se muestra vacío.
    margenBrutoPct: unitsWithCost > 0 ? margenBrutoPct : null,
    gananciaNeta: waterfall.neto,
    unidadesVendidas,
    costoPromedioPorPedido,
    customerEconomics,
    cac,
    cacBlended,
    opexProrated,
    ratioMargenBrutoCac: unitsWithCost > 0 ? ratioMargenBrutoCac : null,
    ratioLtvCac,
  }

  return {
    tnConnected,
    tnError,
    ordersTruncated,
    checkoutsTruncated,
    costsLoadError,
    storeName: tnConnection?.store_name ?? null,
    metaConnected: metaUsable,
    metaTokenExpired: !!metaConnection && tokenExpired,
    metaError,
    hasMetaSpend,
    summary,
    previousSummary,
    waterfall,
    previousWaterfall,
    dailyData,
    ranking,
    ledger,
    insights,
    funnelSteps,
    kpis: { roasReal, cpaReal, aov, mer, margenPct },
    roasMeta,
    cpaPrevious,
    trends,
    series,
    currencyMismatchNoRate,
    accountCurrency,
    metaSpendArs,
    metaSpendPreviousArs,
    metaCurrent: metaCurrentResult?.ok ? metaCurrentResult.spend : null,
    envioReal,
    gatewayGross,
    manualSales,
    manualTotal,
    finConfig,
    costsMap,
    costsList,
    catalog,
    catalogError,
    currentOrders,
    operatingCosts,
    opexMonthlyTotal,
    checkoutFunnel,
    checkoutError,
    abandonedCheckouts,
    coupons,
    unitEconomics,
    missingSetup,
    gatewaySharePct,
    usdArsRate: accountCurrency === 'USD' && metaUsable ? usdArsRate : null,
  }
}

export type SalesReport = Awaited<ReturnType<typeof buildSalesReport>>
