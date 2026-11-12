import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { buildSalesReport, resolvePeriod, type SalesReport } from '@/lib/reports/sales-report'
import { getTiendaNubeOrders } from '@/lib/tiendanube/orders'
import { getTiendaNubeProducts } from '@/lib/tiendanube/products'
import { getProductCostsMap } from '@/lib/tiendanube/product-costs'
import { getMetaCampaigns } from '@/lib/meta/campaigns'
import { getUsdArsRate, convertAmount, type Currency } from '@/lib/currency'
import { arDateKey } from '@/lib/argentina-time'
import { roleLabel } from '@/lib/organization/roles'
import type { ConnectorIdentity, ConnectorOrganization } from './tokens'

// Consultas que Claude puede hacer sobre Gotix — TODAS de solo lectura.
// Cada una recibe la cuenta (organización) por nombre y solo puede ver las
// organizaciones de las que es miembro el dueño de la clave. Los números
// del resumen salen de buildSalesReport, el mismo cálculo que la pantalla
// de Ventas. Cada respuesta trae avisos (qué falta cargar, qué dato no
// está) y una explicación en castellano de cómo se calcula cada número.

export class ToolError extends Error {}

type Args = Record<string, unknown>
type Ctx = { identity: ConnectorIdentity; supabase: SupabaseClient }

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const money = (n: number) => Math.round(n)
const dec1 = (n: number) => Math.round(n * 10) / 10
const dec2 = (n: number) => Math.round(n * 100) / 100
const pctOrNull = (n: number | null) => (n === null ? null : dec1(n))

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function pickOrganization(identity: ConnectorIdentity, cuenta: unknown): ConnectorOrganization {
  const orgs = identity.organizations
  const names = orgs.map((o) => o.name).join(', ')
  if (orgs.length === 0) throw new ToolError('Este usuario todavía no pertenece a ninguna cuenta en Gotix.')

  if (typeof cuenta !== 'string' || !cuenta.trim()) {
    if (orgs.length === 1) return orgs[0]
    throw new ToolError(`Indicá de qué cuenta. Cuentas disponibles: ${names}.`)
  }

  const wanted = normalize(cuenta)
  const byId = orgs.find((o) => o.id === cuenta.trim())
  if (byId) return byId
  const exact = orgs.filter((o) => normalize(o.name) === wanted)
  if (exact.length === 1) return exact[0]
  const partial = orgs.filter((o) => normalize(o.name).includes(wanted) || wanted.includes(normalize(o.name)))
  if (partial.length === 1) return partial[0]
  if (partial.length > 1) {
    throw new ToolError(`"${cuenta}" coincide con varias cuentas: ${partial.map((o) => o.name).join(', ')}. Indicá cuál.`)
  }
  throw new ToolError(`No encontré la cuenta "${cuenta}". Cuentas disponibles: ${names}.`)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function resolveArgsPeriod(args: Args, defaultDays = 30) {
  const desde = typeof args.desde === 'string' ? args.desde.trim() : undefined
  const hasta = typeof args.hasta === 'string' ? args.hasta.trim() : undefined
  if (desde || hasta) {
    if (!desde || !hasta || !DATE_RE.test(desde) || !DATE_RE.test(hasta)) {
      throw new ToolError('Para un rango de fechas pasá "desde" y "hasta" con formato AAAA-MM-DD.')
    }
    if (desde > hasta) throw new ToolError('"desde" tiene que ser anterior o igual a "hasta".')
  }
  const dias = args.dias === undefined || args.dias === null ? defaultDays : Number(args.dias)
  if (!desde && (!Number.isFinite(dias) || dias < 1 || dias > 90)) {
    throw new ToolError('"dias" tiene que ser un número entre 1 y 90.')
  }
  const { periodStart, periodEnd } = resolvePeriod(String(Math.round(dias)), desde, hasta)
  return { periodStart, periodEnd }
}

function describePeriod(start: Date, end: Date) {
  const lengthMs = end.getTime() - start.getTime()
  const prevStart = new Date(start.getTime() - lengthMs)
  return {
    desde: arDateKey(start),
    hasta: arDateKey(end),
    dias: Math.round(lengthMs / 86400000),
    se_compara_con: { desde: arDateKey(prevStart), hasta: arDateKey(start) },
    zona_horaria: 'Argentina',
  }
}

function variantLabel(productName: string, variantName: string | null) {
  return variantName ? `${productName} — ${variantName}` : productName
}

async function loadStoreConnection(supabase: SupabaseClient, org: ConnectorOrganization) {
  const { data } = await supabase
    .from('tiendanube_connections')
    .select('access_token, store_id, store_name')
    .eq('organization_id', org.id)
    .maybeSingle()
  if (!data) throw new ToolError(`La cuenta ${org.name} no tiene Tienda Nube conectada en Gotix.`)
  return data as { access_token: string; store_id: string; store_name: string | null }
}

/** Órdenes del período + catálogo + costos, sin Meta ni carritos — para las consultas de productos y stock. */
async function loadStoreData(supabase: SupabaseClient, org: ConnectorOrganization, start: Date, end: Date) {
  const tn = await loadStoreConnection(supabase, org)
  const [ordersResult, catalogResult, costsResult] = await Promise.all([
    getTiendaNubeOrders(tn.access_token, tn.store_id, start, end),
    getTiendaNubeProducts(tn.access_token, tn.store_id),
    getProductCostsMap(supabase, org.id),
  ])
  if (!ordersResult.ok) throw new ToolError('Tienda Nube no respondió al pedir las órdenes. Probá de nuevo en un rato.')
  if (!catalogResult.ok) throw new ToolError('Tienda Nube no respondió al pedir el catálogo. Probá de nuevo en un rato.')
  const startISO = start.toISOString()
  return {
    storeName: tn.store_name,
    orders: ordersResult.orders.filter((o) => o.createdAt >= startISO),
    ordersTruncated: ordersResult.truncated,
    catalog: catalogResult.variants,
    costsMap: costsResult.costsMap,
    costsLoadError: costsResult.error,
  }
}

// ---------------------------------------------------------------------------
// Esquemas comunes
// ---------------------------------------------------------------------------

const CUENTA_PROP = {
  type: 'string',
  description:
    'Nombre de la cuenta (organización de Gotix), por ejemplo "El Palacio". No hace falta escribirlo exacto. Si el usuario tiene una sola cuenta se puede omitir. Usá listar_cuentas para ver los nombres.',
}
const PERIOD_PROPS = {
  dias: { type: 'integer', minimum: 1, maximum: 90, description: 'Últimos N días (1 a 90). Por defecto 30. Se ignora si se pasan desde/hasta.' },
  desde: { type: 'string', description: 'Inicio de un rango personalizado, AAAA-MM-DD. Va junto con "hasta".' },
  hasta: { type: 'string', description: 'Fin de un rango personalizado, AAAA-MM-DD (incluido). Va junto con "desde".' },
}
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }

// ---------------------------------------------------------------------------
// listar_cuentas
// ---------------------------------------------------------------------------

async function listarCuentas({ identity, supabase }: Ctx) {
  const ids = identity.organizations.map((o) => o.id)
  if (ids.length === 0) return { cuentas: [], aviso: 'Este usuario todavía no pertenece a ninguna cuenta en Gotix.' }

  const [{ data: tn }, { data: meta }, { data: costs }, { data: fin }] = await Promise.all([
    supabase.from('tiendanube_connections').select('organization_id, store_name').in('organization_id', ids),
    supabase.from('meta_connections').select('organization_id, account_name, account_currency, expires_at').in('organization_id', ids),
    supabase.from('product_costs').select('organization_id').in('organization_id', ids),
    supabase.from('fin_config').select('organization_id, comision_tn_pct, pasarela_pct, impuestos_pct').in('organization_id', ids),
  ])

  const now = new Date()
  return {
    usuario: identity.email,
    cuentas: identity.organizations.map((org) => {
      const store = (tn ?? []).find((t) => t.organization_id === org.id)
      const ads = (meta ?? []).find((m) => m.organization_id === org.id)
      const finRow = (fin ?? []).find((f) => f.organization_id === org.id)
      const expired = ads?.expires_at ? new Date(ads.expires_at) < now : false
      return {
        nombre: org.name,
        rol: roleLabel(org.role),
        tienda_nube: store ? { conectada: true, tienda: store.store_name } : { conectada: false },
        meta_ads: ads
          ? {
              conectada: !expired,
              estado: expired ? 'conexión vencida: hay que reconectar Meta en Integraciones' : 'conectada',
              cuenta_publicitaria: ads.account_name,
              moneda: ads.account_currency ?? 'USD',
            }
          : { conectada: false },
        costos_de_producto_cargados: (costs ?? []).filter((c) => c.organization_id === org.id).length,
        comisiones_e_impuestos_cargados: !!finRow && (finRow.comision_tn_pct !== null || finRow.pasarela_pct !== null || finRow.impuestos_pct !== null),
      }
    }),
  }
}

// ---------------------------------------------------------------------------
// resumen_ventas
// ---------------------------------------------------------------------------

function buildWarnings(r: SalesReport): string[] {
  const avisos: string[] = []
  if (!r.tnConnected) avisos.push('La cuenta no tiene Tienda Nube conectada: no hay ventas para analizar.')
  if (r.tnError) avisos.push('Tienda Nube no respondió al pedir las órdenes; las ventas pueden estar vacías o incompletas.')
  if (r.ordersTruncated) avisos.push('El período tiene más de 4.000 órdenes y se trajeron solo las primeras: los totales quedan cortos. Conviene un período más corto.')
  if (r.costsLoadError) avisos.push('No se pudieron leer los costos cargados en Gotix: costo de producto, comisiones y costos fijos pueden figurar en 0.')
  if (r.tnConnected && r.summary.ordenes > 0 && r.missingSetup.costCoveragePct === 0) {
    avisos.push(
      'Ningún producto vendido tiene costo cargado en Gotix: el costo de producto cuenta como $0, así que la ganancia y el margen salen mucho más altos que la realidad. Se cargan en Ventas > Costos.'
    )
  } else if (r.tnConnected && r.missingSetup.costCoveragePct < 100) {
    avisos.push(
      `Solo el ${dec1(r.missingSetup.costCoveragePct)}% de las unidades vendidas tiene costo de producto cargado (${r.missingSetup.variantsWithoutCost} variantes vendidas sin costo). Esas cuentan como costo $0, así que la ganancia y el margen salen más altos que la realidad.`
    )
  }
  if (r.missingSetup.noCommissions) avisos.push('No hay comisiones de Tienda Nube ni de pasarela cargadas: no se descuentan de la ganancia.')
  if (r.missingSetup.noTaxes) avisos.push('No hay % de impuestos cargado: no se descuentan de la ganancia.')
  if (r.metaTokenExpired) avisos.push('La conexión con Meta está vencida: el gasto en publicidad figura en 0 hasta reconectar en Integraciones.')
  else if (!r.metaConnected) avisos.push('La cuenta no tiene Meta Ads conectado: el gasto en publicidad figura en 0.')
  if (r.metaError) avisos.push('Meta no respondió al pedir el gasto del período: la publicidad puede figurar en 0.')
  if (r.currencyMismatchNoRate) avisos.push('La cuenta de Meta factura en dólares y no se pudo obtener la cotización: el gasto quedó sin convertir a pesos.')
  if (r.checkoutError) avisos.push('No se pudieron leer los carritos abandonados de Tienda Nube.')
  return avisos
}

const GLOSARIO_RESUMEN = {
  facturacion_bruta: 'Suma de las órdenes pagadas y no canceladas de Tienda Nube en el período: subtotal − descuentos + envío cobrado al cliente. No incluye las ventas manuales.',
  costo_de_producto: 'Unidades vendidas × costo cargado en Gotix para cada variante. Variante sin costo cargado = $0 (ver avisos).',
  meta_ads: 'Gasto de la cuenta publicitaria en el período. Si factura en dólares se pasa a pesos con el dólar cripto del día.',
  envios: 'Lo que el envío le cuesta a la tienda según Tienda Nube (incluye envíos gratis o bonificados). Si hay un costo de envío promedio cargado a mano en Gotix, se usa ese × cantidad de órdenes.',
  comision_tienda_nube: '% de comisión de Tienda Nube cargado en Gotix × facturación bruta.',
  comision_pasarela: '% de pasarela cargado en Gotix × facturación cobrada por pasarela (Pago Nube, Mercado Pago, tarjeta). Transferencias y efectivo no pagan.',
  impuestos: '% de impuestos cargado en Gotix × facturación bruta.',
  costos_fijos: 'Total mensual de costos fijos cargados en Gotix, prorrateado a los días del período (mensual × días ÷ 30).',
  resultado_neto_real: 'Facturación bruta menos todos los costos anteriores. Es lo que de verdad quedó.',
  margen_neto_pct: 'Resultado neto real ÷ facturación bruta.',
  roas_real: 'Resultado neto real ÷ gasto en Meta: cuánta ganancia neta quedó por cada peso invertido en publicidad.',
  roas_que_informa_meta: 'Ingresos que Meta se atribuye ÷ gasto. Suele ser más alto que la realidad: Meta cuenta ventas que pudieron venir de otro lado y no descuenta costos.',
  mer: 'Facturación bruta total ÷ gasto en Meta (eficiencia de marketing de toda la tienda).',
  cpa_real: '(Gasto en Meta + costo de producto + envíos) ÷ cantidad de órdenes: cuánto cuesta, en promedio, concretar cada venta.',
  ticket_promedio: 'Facturación bruta ÷ cantidad de órdenes.',
  costo_por_cliente: 'Gasto en Meta ÷ clientes distintos del período. No separa clientes nuevos de recurrentes, así que es un costo por cliente activo, no un CAC estricto.',
  carritos: 'Carritos creados = carritos abandonados + órdenes del período. Tienda Nube solo guarda los carritos abandonados recientes.',
}

async function resumenVentas(ctx: Ctx, args: Args) {
  const org = pickOrganization(ctx.identity, args.cuenta)
  const { periodStart, periodEnd } = resolveArgsPeriod(args)
  const r = await buildSalesReport(ctx.supabase, org.id, periodStart, periodEnd)
  const w = r.waterfall
  const pw = r.previousWaterfall
  const ue = r.unitEconomics
  const ce = ue.customerEconomics

  const compare = (actual: number, anterior: number | null, cambio: number | null) => ({
    actual: dec2(actual),
    anterior: anterior === null ? null : dec2(anterior),
    cambio_pct: pctOrNull(cambio),
  })
  const prevOrders = r.previousSummary.ordenes

  return {
    cuenta: org.name,
    tienda: r.storeName,
    moneda: 'ARS',
    periodo: describePeriod(periodStart, periodEnd),
    resultado: {
      facturacion_bruta: money(w.bruto),
      resultado_neto_real: money(w.neto),
      margen_neto_pct: dec1(r.kpis.margenPct),
      ordenes: r.summary.ordenes,
      unidades_vendidas: ue.unidadesVendidas,
      ticket_promedio: money(r.kpis.aov),
      margen_bruto_pct: pctOrNull(ue.margenBrutoPct),
    },
    cascada_de_rentabilidad: w.steps.map((s) => ({ concepto: s.label, monto: money(s.value), queda: money(s.cumulative) })),
    vs_periodo_anterior: {
      facturacion_bruta: compare(r.summary.bruto, r.previousSummary.bruto, r.trends.bruto),
      resultado_neto_real: compare(w.neto, pw.neto, r.trends.neto),
      ordenes: compare(r.summary.ordenes, prevOrders, r.trends.ordenes),
      ticket_promedio: compare(r.kpis.aov, prevOrders > 0 ? r.previousSummary.bruto / prevOrders : null, r.trends.aov),
      margen_neto_pct: compare(r.kpis.margenPct, r.previousSummary.bruto > 0 ? (pw.neto / r.previousSummary.bruto) * 100 : null, r.trends.margenPct),
      gasto_meta: compare(
        r.metaSpendArs,
        r.metaSpendPreviousArs,
        r.metaSpendPreviousArs > 0 ? ((r.metaSpendArs - r.metaSpendPreviousArs) / r.metaSpendPreviousArs) * 100 : null
      ),
      roas_real: compare(r.kpis.roasReal, r.metaSpendPreviousArs > 0 ? pw.neto / r.metaSpendPreviousArs : null, r.trends.roas),
      cpa_real: compare(r.kpis.cpaReal, r.cpaPrevious, r.trends.cpa),
    },
    publicidad_meta: {
      conectada: r.metaConnected,
      gasto_en_pesos: money(r.metaSpendArs),
      moneda_de_la_cuenta: r.accountCurrency,
      gasto_en_moneda_de_la_cuenta: r.metaCurrent ? dec2(r.metaCurrent.spend) : null,
      cotizacion_usd_usada: r.usdArsRate,
      roas_real: dec2(r.kpis.roasReal),
      roas_que_informa_meta: dec2(r.roasMeta),
      mer: dec2(r.kpis.mer),
      cpa_real: money(r.kpis.cpaReal),
      compras_que_informa_meta: r.metaCurrent?.purchases ?? null,
      ordenes_reales_en_tienda: r.summary.ordenes,
      embudo_meta: r.funnelSteps.map((s) => ({ paso: s.label, cantidad: s.value })),
    },
    clientes: {
      clientes_distintos: ce.totalCustomers,
      clientes_que_recompraron: ce.repeatCustomers,
      tasa_de_recompra_pct: pctOrNull(ce.repeatRatePct),
      ordenes_por_cliente: ce.avgOrdersPerCustomer === null ? null : dec2(ce.avgOrdersPerCustomer),
      facturacion_por_cliente: ce.avgRevenuePerCustomer === null ? null : money(ce.avgRevenuePerCustomer),
      dias_promedio_entre_compras: ce.avgDaysBetweenPurchases === null ? null : dec1(ce.avgDaysBetweenPurchases),
      ordenes_sin_cliente_identificado: ce.unidentifiedOrders,
      costo_por_cliente_meta: ue.cac === null ? null : money(ue.cac),
      costo_por_cliente_meta_mas_fijos: ue.cacBlended === null ? null : money(ue.cacBlended),
      costo_promedio_por_pedido: money(ue.costoPromedioPorPedido),
    },
    carritos: {
      carritos_creados: r.checkoutFunnel.carritosCreados,
      ventas_cerradas: r.checkoutFunnel.ventasCerradas,
      abandonados: r.checkoutFunnel.abandonados,
      conversion_pct: dec1(r.checkoutFunnel.tasaConversion),
    },
    configuracion_usada: {
      comision_tienda_nube_pct: r.finConfig.comisionTnPct,
      comision_pasarela_pct: r.finConfig.pasarelaPct,
      parte_cobrada_por_pasarela_pct: dec1(r.gatewaySharePct),
      impuestos_pct: r.finConfig.impuestosPct,
      costo_envio_promedio_cargado: r.finConfig.costoEnvioPromedio,
      costos_fijos_mensuales: money(r.opexMonthlyTotal),
      costos_fijos_del_periodo: money(ue.opexProrated),
    },
    ventas_manuales: {
      aviso: 'Se cargan a mano en Gotix y NO están sumadas en la facturación de arriba.',
      cantidad: r.manualSales.length,
      total: money(r.manualTotal),
    },
    ventas_por_dia: r.dailyData.map((d) => ({ dia: d.date, facturacion: d.bruto, ordenes: d.ordenes })),
    alertas_de_gotix: r.insights.map((i) => i.message),
    avisos: buildWarnings(r),
    como_se_calcula: GLOSARIO_RESUMEN,
  }
}

// ---------------------------------------------------------------------------
// rentabilidad_por_producto
// ---------------------------------------------------------------------------

async function rentabilidadPorProducto(ctx: Ctx, args: Args) {
  const org = pickOrganization(ctx.identity, args.cuenta)
  const { periodStart, periodEnd } = resolveArgsPeriod(args)
  const data = await loadStoreData(ctx.supabase, org, periodStart, periodEnd)
  const periodDays = Math.max(1, (periodEnd.getTime() - periodStart.getTime()) / 86400000)
  const catalogById = new Map(data.catalog.map((v) => [v.variantId, v]))

  type Row = { key: string; nombre: string; unidades: number; facturacion: number; costo: number; tieneCosto: boolean; stock: number | null }
  const rows = new Map<string, Row>()
  for (const order of data.orders) {
    // Descuentos, cupones y promos de la orden repartidos en proporción a
    // cada línea: así la facturación por producto es lo que se cobró de
    // verdad y no el precio de lista.
    const listTotal = order.lineItems.reduce((s, li) => s + li.price * li.quantity, 0)
    const charged = order.subtotal - order.discount
    const factor = listTotal > 0 && charged > 0 ? Math.min(1, charged / listTotal) : 1
    for (const item of order.lineItems) {
      const key = item.variantId !== null ? String(item.variantId) : `sin-variante:${item.name}`
      const unitCost = item.variantId !== null ? data.costsMap.get(item.variantId)?.cost ?? 0 : 0
      const catalogVariant = item.variantId !== null ? catalogById.get(item.variantId) : undefined
      const existing = rows.get(key)
      if (existing) {
        existing.unidades += item.quantity
        existing.facturacion += item.price * item.quantity * factor
        existing.costo += unitCost * item.quantity
      } else {
        rows.set(key, {
          key,
          nombre:
            (item.variantId !== null ? data.costsMap.get(item.variantId)?.name : null) ||
            (catalogVariant ? variantLabel(catalogVariant.productName, catalogVariant.variantName) : item.name),
          unidades: item.quantity,
          facturacion: item.price * item.quantity * factor,
          costo: unitCost * item.quantity,
          tieneCosto: unitCost > 0,
          stock: catalogVariant?.stock ?? null,
        })
      }
    }
  }

  const all = Array.from(rows.values())
  const totalRevenue = all.reduce((s, r) => s + r.facturacion, 0)
  const ordenar = args.ordenar_por === 'facturacion' || args.ordenar_por === 'unidades' ? args.ordenar_por : 'ganancia'
  all.sort((a, b) =>
    ordenar === 'facturacion'
      ? b.facturacion - a.facturacion
      : ordenar === 'unidades'
        ? b.unidades - a.unidades
        : (b.tieneCosto ? b.facturacion - b.costo : -Infinity) - (a.tieneCosto ? a.facturacion - a.costo : -Infinity) ||
          b.facturacion - a.facturacion
  )
  const limite = Math.max(1, Math.min(300, Number(args.limite) || 40))

  const sinCosto = all.filter((r) => !r.tieneCosto)
  const avisos: string[] = []
  if (data.ordersTruncated) avisos.push('El período tiene más de 4.000 órdenes y se trajeron solo las primeras.')
  if (data.costsLoadError) avisos.push('No se pudieron leer los costos cargados en Gotix: todos figuran en 0.')
  if (sinCosto.length > 0) {
    avisos.push(
      `${sinCosto.length} productos vendidos no tienen costo cargado en Gotix: su ganancia figura igual a la facturación (no es real). Se cargan en Ventas > Costos.`
    )
  }

  return {
    cuenta: org.name,
    tienda: data.storeName,
    moneda: 'ARS',
    periodo: describePeriod(periodStart, periodEnd),
    ordenado_por: ordenar,
    totales: {
      productos_vendidos: all.length,
      unidades: all.reduce((s, r) => s + r.unidades, 0),
      facturacion_de_productos: money(totalRevenue),
      costo_de_producto: money(all.reduce((s, r) => s + r.costo, 0)),
      ganancia_bruta_de_productos_con_costo:
        sinCosto.length === all.length ? null : money(all.filter((r) => r.tieneCosto).reduce((s, r) => s + r.facturacion - r.costo, 0)),
      productos_sin_costo_cargado: sinCosto.length,
    },
    productos: all.slice(0, limite).map((r) => {
      const ventaDiaria = r.unidades / periodDays
      return {
        producto: r.nombre,
        unidades: r.unidades,
        facturacion: money(r.facturacion),
        parte_de_la_facturacion_pct: totalRevenue > 0 ? dec1((r.facturacion / totalRevenue) * 100) : 0,
        costo_total: r.tieneCosto ? money(r.costo) : null,
        costo_unitario: r.tieneCosto ? money(r.costo / r.unidades) : null,
        ganancia_bruta: r.tieneCosto ? money(r.facturacion - r.costo) : null,
        margen_bruto_pct: r.tieneCosto && r.facturacion > 0 ? dec1(((r.facturacion - r.costo) / r.facturacion) * 100) : null,
        stock_actual: r.stock,
        dias_de_stock_al_ritmo_actual: r.stock !== null && ventaDiaria > 0 ? Math.round(r.stock / ventaDiaria) : null,
      }
    }),
    productos_no_mostrados: Math.max(0, all.length - limite),
    avisos,
    como_se_calcula: {
      facturacion: 'Lo cobrado por el producto en órdenes pagadas y no canceladas: precio × unidades, con los descuentos, cupones y promos de cada orden repartidos en proporción entre sus productos. No incluye envío, por eso la suma es algo menor que la facturación bruta del resumen.',
      ganancia_bruta: 'Facturación del producto − (costo cargado × unidades). No descuenta publicidad, envíos, comisiones ni impuestos: esos se ven en resumen_ventas a nivel tienda. null = sin costo cargado.',
      dias_de_stock_al_ritmo_actual: 'Stock actual ÷ unidades vendidas por día en el período. null = Tienda Nube no controla el stock de esa variante.',
    },
  }
}

// ---------------------------------------------------------------------------
// stock
// ---------------------------------------------------------------------------

const REPONER_DIAS = 15

async function stock(ctx: Ctx, args: Args) {
  const org = pickOrganization(ctx.identity, args.cuenta)
  const { periodStart, periodEnd } = resolveArgsPeriod(args)
  const data = await loadStoreData(ctx.supabase, org, periodStart, periodEnd)
  const periodDays = Math.max(1, (periodEnd.getTime() - periodStart.getTime()) / 86400000)

  const soldByVariant = new Map<number, number>()
  for (const order of data.orders) {
    for (const item of order.lineItems) {
      if (item.variantId === null) continue
      soldByVariant.set(item.variantId, (soldByVariant.get(item.variantId) ?? 0) + item.quantity)
    }
  }

  const tracked = data.catalog.filter((v) => v.stock !== null)
  const untracked = data.catalog.length - tracked.length

  const rows = tracked.map((v) => {
    const units = v.stock as number
    const vendidas = soldByVariant.get(v.variantId) ?? 0
    const ventaDiaria = vendidas / periodDays
    const cost = data.costsMap.get(v.variantId)?.cost ?? 0
    const cobertura = ventaDiaria > 0 ? units / ventaDiaria : null
    let estado: string
    if (units <= 0) estado = vendidas > 0 ? 'agotado (se venía vendiendo)' : 'agotado'
    else if (vendidas === 0) estado = 'sin ventas en el período'
    else if (cobertura !== null && cobertura < REPONER_DIAS) estado = 'reponer pronto'
    else estado = 'ok'
    return {
      producto: variantLabel(v.productName, v.variantName),
      stock: units,
      vendidas_en_el_periodo: vendidas,
      venta_por_dia: dec2(ventaDiaria),
      dias_de_cobertura: cobertura === null ? null : Math.round(cobertura),
      costo_unitario: cost > 0 ? money(cost) : null,
      capital_en_stock: cost > 0 && units > 0 ? money(cost * units) : null,
      estado,
    }
  })

  const filtro = typeof args.filtro === 'string' ? args.filtro : 'todos'
  let list = rows
  if (filtro === 'reponer') {
    list = rows.filter((r) => r.estado === 'reponer pronto' || r.estado === 'agotado (se venía vendiendo)')
    list.sort((a, b) => (a.dias_de_cobertura ?? -1) - (b.dias_de_cobertura ?? -1))
  } else if (filtro === 'sin_movimiento') {
    list = rows.filter((r) => r.estado === 'sin ventas en el período')
    list.sort((a, b) => (b.capital_en_stock ?? 0) - (a.capital_en_stock ?? 0) || b.stock - a.stock)
  } else if (filtro === 'agotados') {
    list = rows.filter((r) => r.stock <= 0)
    list.sort((a, b) => b.vendidas_en_el_periodo - a.vendidas_en_el_periodo)
  } else {
    const order: Record<string, number> = { 'agotado (se venía vendiendo)': 0, 'reponer pronto': 1, 'sin ventas en el período': 2, ok: 3, agotado: 4 }
    list.sort((a, b) => order[a.estado] - order[b.estado] || (b.capital_en_stock ?? 0) - (a.capital_en_stock ?? 0))
  }
  const limite = Math.max(1, Math.min(300, Number(args.limite) || 60))

  const count = (estado: string) => rows.filter((r) => r.estado === estado).length
  const avisos: string[] = []
  if (tracked.length === 0) avisos.push('Esta tienda no usa el control de stock de Tienda Nube en ninguna variante: no hay stock para analizar.')
  else if (untracked > 0) avisos.push(`${untracked} variantes no tienen control de stock en Tienda Nube ("stock ilimitado") y quedan afuera.`)
  const sinCosto = rows.filter((r) => r.stock > 0 && r.costo_unitario === null).length
  if (sinCosto > 0) avisos.push(`${sinCosto} variantes con stock no tienen costo cargado en Gotix: no suman al capital en stock.`)
  if (data.ordersTruncated) avisos.push('El período tiene más de 4.000 órdenes y se trajeron solo las primeras: las ventas por variante quedan cortas.')

  return {
    cuenta: org.name,
    tienda: data.storeName,
    moneda: 'ARS',
    stock_al: arDateKey(new Date()),
    ventas_medidas_en: describePeriod(periodStart, periodEnd),
    filtro,
    totales: {
      variantes_con_control_de_stock: tracked.length,
      unidades_en_stock: rows.reduce((s, r) => s + Math.max(0, r.stock), 0),
      capital_en_stock: money(rows.reduce((s, r) => s + (r.capital_en_stock ?? 0), 0)),
      capital_sin_movimiento: money(rows.filter((r) => r.estado === 'sin ventas en el período').reduce((s, r) => s + (r.capital_en_stock ?? 0), 0)),
      agotadas_con_demanda: count('agotado (se venía vendiendo)'),
      para_reponer_pronto: count('reponer pronto'),
      sin_ventas_en_el_periodo: count('sin ventas en el período'),
      ok: count('ok'),
    },
    variantes: list.slice(0, limite),
    variantes_no_mostradas: Math.max(0, list.length - limite),
    avisos,
    como_se_calcula: {
      stock: 'Stock actual informado por Tienda Nube, en este momento.',
      venta_por_dia: 'Unidades vendidas en el período ÷ días del período.',
      dias_de_cobertura: 'Stock ÷ venta por día: cuántos días dura el stock si se sigue vendiendo al mismo ritmo.',
      reponer_pronto: `Tiene stock pero alcanza para menos de ${REPONER_DIAS} días al ritmo actual.`,
      capital_en_stock: 'Stock × costo cargado en Gotix. Es plata inmovilizada en mercadería.',
      capital_sin_movimiento: 'Capital en stock de las variantes que no vendieron ni una unidad en el período.',
    },
  }
}

// ---------------------------------------------------------------------------
// campanas_meta
// ---------------------------------------------------------------------------

async function campanasMeta(ctx: Ctx, args: Args) {
  const org = pickOrganization(ctx.identity, args.cuenta)
  const dias = args.dias === undefined ? 30 : Number(args.dias)
  if (!Number.isFinite(dias) || dias < 1 || dias > 90) throw new ToolError('"dias" tiene que ser un número entre 1 y 90.')

  const { data: conn } = await ctx.supabase
    .from('meta_connections')
    .select('token, account_id, account_name, account_currency, expires_at')
    .eq('organization_id', org.id)
    .maybeSingle()
  if (!conn) throw new ToolError(`La cuenta ${org.name} no tiene Meta Ads conectado en Gotix.`)
  if (conn.expires_at && new Date(conn.expires_at) < new Date()) {
    throw new ToolError(`La conexión con Meta de ${org.name} está vencida. Hay que reconectarla en Configuración > Integraciones.`)
  }

  const [result, rate] = await Promise.all([getMetaCampaigns(conn.token, conn.account_id, Math.round(dias)), getUsdArsRate()])
  if (!result.ok) throw new ToolError('Meta no respondió al pedir las campañas. Probá de nuevo en un rato.')

  const currency: Currency = conn.account_currency === 'ARS' ? 'ARS' : 'USD'
  const toArs = (n: number) => money(convertAmount(n, currency, 'ARS', rate))
  const incluirTodas = args.incluir_sin_gasto === true
  const campaigns = result.campaigns.filter((c) => incluirTodas || c.spend > 0 || c.effectiveStatus === 'ACTIVE')

  const totalSpend = result.campaigns.reduce((s, c) => s + c.spend, 0)
  const totalRevenue = result.campaigns.reduce((s, c) => s + c.revenue, 0)
  const totalPurchases = result.campaigns.reduce((s, c) => s + c.purchases, 0)

  return {
    cuenta: org.name,
    cuenta_publicitaria: conn.account_name,
    moneda_de_la_cuenta: currency,
    cotizacion_usd_usada: currency === 'USD' ? rate : null,
    ultimos_dias: Math.round(dias),
    totales: {
      gasto: dec2(totalSpend),
      gasto_en_pesos: toArs(totalSpend),
      ingresos_que_informa_meta: dec2(totalRevenue),
      compras_que_informa_meta: totalPurchases,
      roas_que_informa_meta: totalSpend > 0 ? dec2(totalRevenue / totalSpend) : null,
      cpa_que_informa_meta: totalPurchases > 0 ? dec2(totalSpend / totalPurchases) : null,
    },
    campanas: campaigns.map((c) => ({
      nombre: c.name,
      estado: c.effectiveStatus,
      objetivo: c.objective,
      presupuesto_diario: c.dailyBudget,
      presupuesto_total: c.lifetimeBudget,
      gasto: dec2(c.spend),
      gasto_en_pesos: toArs(c.spend),
      parte_del_gasto_pct: totalSpend > 0 ? dec1((c.spend / totalSpend) * 100) : 0,
      compras: c.purchases,
      ingresos_que_informa_meta: dec2(c.revenue),
      roas: dec2(c.roas),
      cpa: dec2(c.cpa),
      ticket_promedio: dec2(c.aov),
      ctr_pct: dec2(c.ctr),
      cpc: dec2(c.cpc),
      cpm: dec2(c.cpm),
      frecuencia: dec2(c.frequency),
      hook_rate_pct: c.hookRate,
      impresiones: c.impressions,
      clics: c.linkClicks,
      agregados_al_carrito: c.addToCart,
      checkouts_iniciados: c.initiateCheckout,
      costo_por_carrito: dec2(c.costPerATC),
      costo_por_checkout: dec2(c.costPerIC),
    })),
    campanas_sin_gasto_ocultas: result.campaigns.length - campaigns.length,
    avisos: currency === 'USD' && rate === null ? ['No se pudo obtener la cotización del dólar: los montos en pesos quedaron sin convertir.'] : [],
    como_se_calcula: {
      montos: 'gasto, cpa, cpc, cpm y presupuestos están en la moneda de la cuenta publicitaria; los campos *_en_pesos usan el dólar cripto del día.',
      roas: 'Ingresos que Meta se atribuye ÷ gasto. Es la versión de Meta: para el resultado real cruzado con Tienda Nube usá resumen_ventas (roas_real).',
      hook_rate_pct: 'Reproducciones de video ÷ impresiones: qué parte de la gente frenó a mirar el video.',
      frecuencia: 'Veces promedio que cada persona vio los anuncios. Arriba de 3 suele indicar cansancio del público.',
    },
  }
}

// ---------------------------------------------------------------------------
// detalle_ordenes
// ---------------------------------------------------------------------------

async function detalleOrdenes(ctx: Ctx, args: Args) {
  const org = pickOrganization(ctx.identity, args.cuenta)
  const { periodStart, periodEnd } = resolveArgsPeriod(args, 7)
  const r = await buildSalesReport(ctx.supabase, org.id, periodStart, periodEnd)
  if (!r.tnConnected) throw new ToolError(`La cuenta ${org.name} no tiene Tienda Nube conectada en Gotix.`)
  const limite = Math.max(1, Math.min(300, Number(args.limite) || 50))
  const ledger = [...r.ledger].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const ordersById = new Map(r.currentOrders.map((o) => [o.id, o]))

  return {
    cuenta: org.name,
    tienda: r.storeName,
    moneda: 'ARS',
    periodo: describePeriod(periodStart, periodEnd),
    ordenes_en_el_periodo: ledger.length,
    ordenes: ledger.slice(0, limite).map((e) => {
      const order = ordersById.get(e.orderId)
      return {
        numero: e.orderNumber,
        dia: e.day,
        medio_de_pago: order?.gateway === 'offline' ? 'transferencia / efectivo' : order?.gateway ?? null,
        productos: order?.lineItems.map((li) => `${li.quantity} × ${li.name}`) ?? [],
        facturacion: money(e.bruto),
        costo_de_producto: money(e.cogs),
        envio: money(e.envio),
        comision_tienda_nube: money(e.comisionTn),
        comision_pasarela: money(e.comisionPasarela),
        impuestos: money(e.impuestos),
        publicidad_prorrateada: money(e.adsProrated),
        costos_fijos_prorrateados: money(e.opexProrated),
        resultado_neto: money(e.neto),
      }
    }),
    ordenes_no_mostradas: Math.max(0, ledger.length - limite),
    avisos: buildWarnings(r),
    como_se_calcula: {
      publicidad_prorrateada: 'Gasto en Meta del período ÷ cantidad de órdenes, repartido igual en cada una. No es lo que costó traer esa venta puntual (eso Tienda Nube no lo informa).',
      costos_fijos_prorrateados: 'Costos fijos del período ÷ cantidad de órdenes, repartidos igual.',
      resultado_neto: 'Facturación de la orden menos todos sus costos.',
    },
  }
}

// ---------------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------------

type ToolDef = {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
  annotations: typeof READ_ONLY & { title: string }
  run: (ctx: Ctx, args: Args) => Promise<unknown>
}

function tool(name: string, title: string, description: string, properties: Record<string, unknown>, run: ToolDef['run']): ToolDef {
  return {
    name,
    title,
    description,
    inputSchema: { type: 'object', properties, additionalProperties: false },
    annotations: { ...READ_ONLY, title },
    run,
  }
}

export const TOOLS: ToolDef[] = [
  tool(
    'listar_cuentas',
    'Listar cuentas',
    'Lista las cuentas (organizaciones) de Gotix a las que tiene acceso el usuario, con qué tiene conectado cada una (Tienda Nube, Meta Ads) y si tiene costos y comisiones cargados. Llamala primero si no sabés el nombre exacto de la cuenta.',
    {},
    (ctx) => listarCuentas(ctx)
  ),
  tool(
    'resumen_ventas',
    'Resumen de ventas y rentabilidad',
    'Rentabilidad neta real de una cuenta en un período: facturación, cascada de costos (producto, Meta Ads, envíos, comisiones, impuestos, costos fijos) hasta el resultado neto, comparación con el período anterior, ROAS real vs. el que informa Meta, CPA real, clientes, recompra, carritos, ventas por día y avisos de datos faltantes. Son los mismos números que la pantalla Ventas de Gotix.',
    { cuenta: CUENTA_PROP, ...PERIOD_PROPS },
    resumenVentas
  ),
  tool(
    'rentabilidad_por_producto',
    'Rentabilidad por producto',
    'Cada producto (variante) vendido en el período: unidades, facturación, costo, ganancia bruta, margen, stock actual y cuántos días de stock quedan al ritmo de venta actual.',
    {
      cuenta: CUENTA_PROP,
      ...PERIOD_PROPS,
      ordenar_por: { type: 'string', enum: ['ganancia', 'facturacion', 'unidades'], description: 'Criterio de orden. Por defecto ganancia.' },
      limite: { type: 'integer', minimum: 1, maximum: 300, description: 'Cuántos productos devolver. Por defecto 40.' },
    },
    rentabilidadPorProducto
  ),
  tool(
    'stock',
    'Stock por producto',
    'Stock actual de cada variante cruzado con lo que se vendió en el período: días de cobertura, qué reponer, qué está agotado con demanda, qué no se mueve y cuánta plata hay inmovilizada en mercadería.',
    {
      cuenta: CUENTA_PROP,
      ...PERIOD_PROPS,
      filtro: {
        type: 'string',
        enum: ['todos', 'reponer', 'sin_movimiento', 'agotados'],
        description: 'todos (por defecto), reponer (se agota pronto o ya se agotó con demanda), sin_movimiento (con stock y sin ventas), agotados.',
      },
      limite: { type: 'integer', minimum: 1, maximum: 300, description: 'Cuántas variantes devolver. Por defecto 60.' },
    },
    stock
  ),
  tool(
    'campanas_meta',
    'Campañas de Meta Ads',
    'Campañas de Meta Ads de la cuenta en los últimos N días: gasto, compras, ROAS y CPA según Meta, CTR, CPC, CPM, frecuencia, hook rate, carritos y checkouts. Por defecto solo las que gastaron o están activas.',
    {
      cuenta: CUENTA_PROP,
      dias: PERIOD_PROPS.dias,
      incluir_sin_gasto: { type: 'boolean', description: 'true para incluir también campañas pausadas sin gasto en el período.' },
    },
    campanasMeta
  ),
  tool(
    'detalle_ordenes',
    'Detalle de órdenes',
    'Órdenes del período, de la más nueva a la más vieja, con productos, medio de pago y el desglose de cada una: facturación, costo de producto, envío, comisiones, impuestos, publicidad y costos fijos prorrateados, y resultado neto. Por defecto últimos 7 días.',
    {
      cuenta: CUENTA_PROP,
      ...PERIOD_PROPS,
      limite: { type: 'integer', minimum: 1, maximum: 300, description: 'Cuántas órdenes devolver. Por defecto 50.' },
    },
    detalleOrdenes
  ),
]

export async function callTool(identity: ConnectorIdentity, name: string, args: Args) {
  const def = TOOLS.find((t) => t.name === name)
  if (!def) throw new ToolError(`No existe la consulta "${name}".`)
  return def.run({ identity, supabase: createServiceRoleClient() as unknown as SupabaseClient }, args ?? {})
}

export const SERVER_INSTRUCTIONS = `Gotix (GOTIX x LADO T) es el panel interno de la agencia: junta Tienda Nube, Meta Ads y los costos cargados a mano de cada cuenta (organización) para calcular la rentabilidad neta real.

- Todo es de solo lectura: estas consultas no cambian nada en Gotix, Tienda Nube ni Meta.
- Cada cuenta es un negocio distinto (por ejemplo El Palacio). Si no sabés el nombre exacto o qué tiene conectado, llamá primero a listar_cuentas. Nunca mezcles números de cuentas distintas sin aclararlo.
- Los montos de ventas están en pesos argentinos (ARS). Los de campanas_meta están en la moneda de la cuenta publicitaria, con equivalente en pesos.
- Cada respuesta trae "avisos" (datos que faltan cargar o no se pudieron leer) y "como_se_calcula". Cuando expliques un número, decí de dónde sale con esas definiciones y mencioná los avisos que lo afecten (por ejemplo, si faltan costos de producto la ganancia está inflada).
- El ROAS que informa Meta y el ROAS real no son lo mismo: el real usa la ganancia neta de Tienda Nube.
- Para cruzar ventas con publicidad usá resumen_ventas; para el detalle por campaña, campanas_meta; para productos, rentabilidad_por_producto y stock.`
