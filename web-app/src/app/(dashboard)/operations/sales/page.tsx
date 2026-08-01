import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getTiendaNubeOrders, summarizeOrders, groupOrdersByDay, rankProducts, buildOrderLedger } from '@/lib/tiendanube/orders'
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
import { SalesWorkspace } from './sales-workspace'

// Dashboard de Rentabilidad Neta (2026-07-25, refactor de pestañas 2026-07-27)
// — /operations/sales cruza Meta Ads + Tienda Nube hasta el Resultado Neto
// Real. Solo 1 tabla nueva (product_costs) — el resto (embudo, gráfico
// diario, ranking de productos, ledger, insights, cascada) se deriva en
// memoria a partir de las órdenes crudas de un único fetch (ver plan:
// /Users/tizianaferreira/.claude/plans/dazzling-foraging-galaxy.md).

const DEFAULT_DAYS = 30

/**
 * Única fuente de verdad del rango activo — soporta presets (`?days=N`) y
 * rango personalizado (`?from=&to=`). Los 3 fetchers (órdenes, checkouts,
 * Meta) reciben `since`/`until` ya resueltos, ninguno vuelve a calcular
 * fechas por su cuenta (antes cada uno tenía su propia lógica de `days`).
 */
function resolvePeriod(daysParam: string | undefined, fromParam: string | undefined, toParam: string | undefined) {
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

export default async function OperationsSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>
}) {
  const { days: daysParam, from: fromParam, to: toParam } = await searchParams
  const { periodStart, periodEnd, activePreset, customFrom, customTo } = resolvePeriod(daysParam, fromParam, toParam)

  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()

  const [{ data: tnConnection }, { data: metaConnection }, manualSales, finConfigResult, productCostsResult, costsList, operatingCostsResult] =
    await Promise.all([
      supabase
        .from('tiendanube_connections')
        .select('access_token, store_id, store_name')
        .eq('organization_id', activeOrganizationId)
        .maybeSingle(),
      supabase
        .from('meta_connections')
        .select('token, account_id, account_currency, expires_at')
        .eq('organization_id', activeOrganizationId)
        .maybeSingle(),
      getManualSales(supabase, activeOrganizationId),
      getFinConfig(supabase, activeOrganizationId),
      getProductCostsMap(supabase, activeOrganizationId),
      listProductCosts(supabase, activeOrganizationId),
      getOperatingCosts(supabase, activeOrganizationId),
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
  // simétrico sea preset o rango personalizado (antes era `days*2` fijo).
  const periodLengthMs = periodEnd.getTime() - periodStart.getTime()
  const previousStart = new Date(periodStart.getTime() - periodLengthMs)
  const periodStartISO = periodStart.toISOString()

  // Costos Fijos (OpEx) — se cargan como total MENSUAL (operating-costs-card.tsx)
  // y se prorratean al largo del período activo. El período anterior tiene el
  // mismo largo por construcción (arriba), así que el prorrateo es idéntico
  // para ambos — no hay que recalcularlo dos veces.
  const opexMonthlyTotal = operatingCosts.reduce((sum, c) => sum + c.monto, 0)
  const periodLengthDays = periodLengthMs / 86400000
  const opexProrated = Math.round(opexMonthlyTotal * (periodLengthDays / 30))

  const [ordersResult, catalogResult, checkoutsResult, couponsResult, usdArsRate, metaCurrentResult, metaPreviousResult] = await Promise.all([
    tnConnection ? getTiendaNubeOrders(tnConnection.access_token, tnConnection.store_id, previousStart, periodEnd) : Promise.resolve(null),
    tnConnection ? getTiendaNubeProducts(tnConnection.access_token, tnConnection.store_id) : Promise.resolve(null),
    // Mismo período doble que las órdenes (previousStart→periodEnd, después
    // partido en dos) — necesario para poder mostrar el delta de Carritos
    // Creados/Abandonados/% Conversión vs. período anterior en la grilla de
    // Inteligencia de Tienda, igual criterio que summary/previousSummary.
    tnConnection ? getTiendaNubeCheckouts(tnConnection.access_token, tnConnection.store_id, previousStart, periodEnd) : Promise.resolve(null),
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
  // Tope real de paginación (20 páginas × 200 = 4000 filas) — si se llega,
  // todo lo derivado de currentOrders/currentCheckouts para el período
  // pedido queda incompleto en silencio si no se avisa.
  const ordersTruncated = ordersResult?.ok ? ordersResult.truncated : false

  const catalog = catalogResult?.ok ? catalogResult.variants : []

  const checkoutError = checkoutsResult && !checkoutsResult.ok ? checkoutsResult.error : null
  const checkoutsTruncated = checkoutsResult?.ok ? checkoutsResult.truncated : false
  const allCheckouts = checkoutsResult?.ok ? checkoutsResult.checkouts : []
  const currentCheckouts = allCheckouts.filter((c) => c.createdAt >= periodStartISO)
  const previousCheckouts = allCheckouts.filter((c) => c.createdAt < periodStartISO)
  const checkoutFunnel = summarizeCheckouts(currentCheckouts)
  const previousCheckoutFunnel = summarizeCheckouts(previousCheckouts)
  const abandonedCheckouts = getRecentAbandonedCheckouts(currentCheckouts, 10)
  const coupons = couponsResult?.ok ? couponsResult.coupons : []

  const summary = summarizeOrders(currentOrders)
  const previousSummary = summarizeOrders(previousOrders)
  const dailyData = groupOrdersByDay(currentOrders)
  const ranking = rankProducts(currentOrders, costsMap, catalog)
  const previousRanking = rankProducts(previousOrders, costsMap, catalog)

  // Gasto de Meta viene en la moneda de la cuenta (accountCurrency) — Tienda
  // Nube siempre en la moneda local de la tienda. Se convierte a ARS para
  // poder restarlo en la misma cascada; si no hay cotización disponible, se
  // usa sin convertir y se avisa (nunca se inventa un número, mismo criterio
  // que lib/currency.ts).
  const accountCurrency: Currency = metaConnection?.account_currency === 'ARS' ? 'ARS' : 'USD'
  const currencyMismatchNoRate = metaUsable && accountCurrency !== 'ARS' && usdArsRate === null

  function toArs(amount: number) {
    return convertAmount(amount, accountCurrency, 'ARS', usdArsRate)
  }

  const metaSpendArs = metaCurrentResult?.ok ? toArs(metaCurrentResult.spend.spend) : 0
  const metaSpendPreviousArs = metaPreviousResult?.ok ? toArs(metaPreviousResult.spend.spend) : 0
  const hasMetaSpend = metaSpendArs > 0

  // Radiografía de la Orden: "Costo publicitario (CPA prorrateado)" = spend
  // total de Meta del período / cantidad de órdenes del período, repartido
  // igual en cada fila — ver orders.ts:buildOrderLedger.
  const ledger = buildOrderLedger(
    currentOrders,
    costsMap,
    {
      comisionTnPct: finConfig.comisionTnPct ?? 0,
      comisionPasarelaPct: finConfig.pasarelaPct ?? 0,
      impuestosPct: finConfig.impuestosPct ?? 0,
    },
    metaSpendArs,
    opexProrated
  )

  // `shipping_cost_customer` (summary.envio) es lo que el CLIENTE pagó de
  // envío — ya está adentro de bruto como ingreso, así que usarlo también
  // como costo asume que el envío es un pass-through perfecto (cobro =
  // costo real del correo), que rara vez es cierto (envío gratis, tarifa
  // subsidiada). `costoEnvioPromedio` de fin_config es el costo real que la
  // tienda carga a mano (Tienda Nube no expone el costo de correo real por
  // ninguna API) — si está cargado, es la fuente correcta; si no, se usa
  // summary.envio como aproximación y se avisa en la UI (fin_config).
  const envioReal = finConfig.costoEnvioPromedio ? Math.round(finConfig.costoEnvioPromedio * summary.ordenes) : summary.envio
  const envioRealPrevious = finConfig.costoEnvioPromedio
    ? Math.round(finConfig.costoEnvioPromedio * previousSummary.ordenes)
    : previousSummary.envio

  const waterfall = computeProfitWaterfall({
    bruto: summary.bruto,
    cogs: ranking.totalCogs,
    metaSpend: metaSpendArs,
    envio: envioReal,
    comisionTn: finConfig.comisionTnPct ? Math.round((summary.bruto * finConfig.comisionTnPct) / 100) : 0,
    comisionPasarela: finConfig.pasarelaPct ? Math.round((summary.bruto * finConfig.pasarelaPct) / 100) : 0,
    impuestos: finConfig.impuestosPct ? Math.round((summary.bruto * finConfig.impuestosPct) / 100) : 0,
    opex: opexProrated,
  })

  // Mismos insumos que arriba, sobre el período anterior — solo para poder
  // mostrar el delta del héroe "Resultado Neto Real". El OpEx prorrateado es
  // el mismo número (mismo largo de período, ver arriba).
  const previousWaterfall = computeProfitWaterfall({
    bruto: previousSummary.bruto,
    cogs: previousRanking.totalCogs,
    metaSpend: metaSpendPreviousArs,
    envio: envioRealPrevious,
    comisionTn: finConfig.comisionTnPct ? Math.round((previousSummary.bruto * finConfig.comisionTnPct) / 100) : 0,
    comisionPasarela: finConfig.pasarelaPct ? Math.round((previousSummary.bruto * finConfig.pasarelaPct) / 100) : 0,
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

  // MER (Marketing Efficiency Ratio) y Margen Neto % — baratos de agregar ya
  // que bruto/neto/spend real ya están calculados; complementan ROAS/CPA sin
  // necesitar ningún dato nuevo.
  const mer = metaSpendArs > 0 ? summary.bruto / metaSpendArs : 0
  const margenPct = summary.bruto > 0 ? (waterfall.neto / summary.bruto) * 100 : 0
  const roasPrevious = metaSpendPreviousArs > 0 ? previousWaterfall.neto / metaSpendPreviousArs : null
  const merPrevious = metaSpendPreviousArs > 0 ? previousSummary.bruto / metaSpendPreviousArs : null
  const margenPctPrevious = previousSummary.bruto > 0 ? (previousWaterfall.neto / previousSummary.bruto) * 100 : null

  // % de cambio vs. período anterior para los indicadores de tendencia de
  // las KpiCard — null cuando no hay base real de comparación (período
  // anterior en 0), nunca se inventa un delta.
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
    carritosCreados: pctDelta(checkoutFunnel.carritosCreados, previousCheckoutFunnel.carritosCreados || null),
    abandonados: pctDelta(checkoutFunnel.abandonados, previousCheckoutFunnel.abandonados || null),
    conversion: pctDelta(checkoutFunnel.tasaConversion, previousCheckoutFunnel.tasaConversion || null),
  }

  // Series diarias para las sparklines — solo Tienda Nube (Bruto/Neto/Órdenes/
  // Ticket Promedio), ya calculadas vía dailyData. ROAS/CPA/MER/Carritos se
  // dejan sin sparkline: necesitarían gasto de Meta día por día o carritos
  // día por día, que no se traen — mejor sin gráfico que uno inventado.
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

  const manualTotal = manualSales.reduce((sum, s) => sum + (s.monto ?? 0), 0)

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Ventas y Operaciones</h1>
          <p className="mt-0.5 max-w-[560px] text-[13px] text-text-2">
            Sistema Operativo de Rentabilidad — cruce de Meta Ads y Tienda Nube hasta el Resultado Neto Real.
          </p>
        </div>
      </div>

      <SalesWorkspace
        activePreset={activePreset}
        customFrom={customFrom}
        customTo={customTo}
        tnConnected={tnConnected}
        tnError={tnError}
        ordersTruncated={ordersTruncated}
        checkoutsTruncated={checkoutsTruncated}
        costsLoadError={costsLoadError}
        storeName={tnConnection?.store_name ?? null}
        lastSyncedAt={new Date().toISOString()}
        metaConnected={metaUsable}
        hasMetaSpend={hasMetaSpend}
        summary={summary}
        waterfall={waterfall}
        dailyData={dailyData}
        ranking={ranking}
        ledger={ledger}
        insights={insights}
        funnelSteps={funnelSteps}
        kpis={{ roasReal, cpaReal, aov, mer, margenPct }}
        trends={trends}
        series={series}
        currencyMismatchNoRate={currencyMismatchNoRate}
        manualSales={manualSales}
        manualTotal={manualTotal}
        finConfig={finConfig}
        costsList={costsList}
        catalog={catalog}
        operatingCosts={operatingCosts}
        checkoutFunnel={checkoutFunnel}
        checkoutError={checkoutError}
        abandonedCheckouts={abandonedCheckouts}
        coupons={coupons}
      />
    </div>
  )
}
