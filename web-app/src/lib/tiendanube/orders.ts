const USER_AGENT = 'GOTIX (contacto@gotix.app)'

// Dashboard de Rentabilidad Neta (2026-07-25) — antes esta función colapsaba
// las órdenes en un agregado y descartaba el detalle. Ahora se traen las
// órdenes crudas (con line items) UNA sola vez, y todo lo demás — resumen,
// serie diaria, ranking de productos — se deriva en memoria (funciones
// puras más abajo), para no pegarle a la API de Tienda Nube una vez por
// cada módulo del dashboard.

export type TiendaNubeOrderLineItem = {
  variantId: number | null
  productId: number | null
  name: string
  quantity: number
  price: number
}

export type TiendaNubeOrderDetail = {
  id: number
  createdAt: string
  status: string | null
  paymentStatus: string | null
  subtotal: number
  discount: number
  shippingCost: number
  lineItems: TiendaNubeOrderLineItem[]
}

/** `truncated: true` = se llegó al tope de 20 páginas (4000 órdenes) con la tienda todavía teniendo más — el período pedido tiene más volumen del que se trajo, y todo lo derivado (Cascada, Ledger, ranking) queda incompleto para ese rango. */
export type TiendaNubeOrdersFetchResult =
  | { ok: true; orders: TiendaNubeOrderDetail[]; truncated: boolean }
  | { ok: false; error: string }

type RawLineItem = {
  variant_id?: number | null
  product_id?: number | null
  name?: string
  quantity?: number | string
  price?: string
}

type RawOrder = {
  id: number
  status?: string
  payment_status?: string
  created_at?: string
  subtotal?: string
  discount?: string
  shipping_cost_customer?: string
  products?: RawLineItem[]
}

/**
 * Trae todas las órdenes pagas del rango pedido, con line items (variant_id +
 * cantidad + precio) para poder calcular COGS y ranking de productos.
 * `since`/`until` explícitos (no un `days` relativo a "hoy") — necesario para
 * soportar el selector de rango de fechas personalizado (2026-07-27), que
 * puede pedir un período que no termina hoy. `page.tsx` es la única fuente
 * de verdad de qué rango está activo; esta función ya no calcula fechas.
 */
export async function getTiendaNubeOrders(
  accessToken: string,
  storeId: string,
  since: Date,
  until: Date
): Promise<TiendaNubeOrdersFetchResult> {
  const sinceISO = since.toISOString()
  const untilISO = until.toISOString()

  try {
    let allOrders: RawOrder[] = []
    let page = 1
    let hasMore = true

    while (hasMore && page <= 20) {
      const res = await fetch(
        `https://api.tiendanube.com/v1/${storeId}/orders?created_at_min=${sinceISO}&created_at_max=${untilISO}&per_page=200&page=${page}`,
        {
          headers: {
            Authentication: `bearer ${accessToken}`,
            'User-Agent': USER_AGENT,
          },
        }
      )

      if (!res.ok) {
        if (res.status === 404) break
        const errBody = await res.text()
        return { ok: false, error: `Tienda Nube respondió con error ${res.status}: ${errBody}` }
      }

      const orders: RawOrder[] = await res.json()
      if (!Array.isArray(orders) || orders.length === 0) {
        hasMore = false
      } else {
        allOrders = allOrders.concat(orders)
        page += 1
        if (orders.length < 200) hasMore = false
      }
    }

    const paidOrders = allOrders.filter(
      (order) => (order.status === 'paid' || order.payment_status === 'paid') && order.status !== 'cancelled'
    )

    const orders: TiendaNubeOrderDetail[] = paidOrders.map((order) => ({
      id: order.id,
      createdAt: order.created_at ?? new Date().toISOString(),
      status: order.status ?? null,
      paymentStatus: order.payment_status ?? null,
      subtotal: parseFloat(order.subtotal || '0'),
      discount: parseFloat(order.discount || '0'),
      shippingCost: parseFloat(order.shipping_cost_customer || '0'),
      lineItems: (order.products ?? []).map((p) => ({
        variantId: p.variant_id ?? null,
        productId: p.product_id ?? null,
        name: p.name ?? 'Sin nombre',
        quantity: Number(p.quantity ?? 0),
        price: parseFloat(p.price || '0'),
      })),
    }))

    // hasMore sigue true solo si la última página vino llena (200) Y el
    // corte fue por el tope de páginas, no porque Tienda Nube se quedó sin
    // datos — en ese caso hay más órdenes de las que se trajeron.
    return { ok: true, orders, truncated: hasMore }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red.' }
  }
}

// ---------------------------------------------------------------------------
// Agregadores puros — operan sobre las órdenes ya traídas, nunca vuelven a
// pegarle a la API de Tienda Nube.
// ---------------------------------------------------------------------------

export type TiendaNubeSalesSummary = { bruto: number; envio: number; neto: number; ordenes: number }

/** Mismo cálculo de bruto/envío/neto que la versión anterior (app.html:tiendanube-orders.js), ahora sobre las órdenes ya traídas. */
export function summarizeOrders(orders: TiendaNubeOrderDetail[]): TiendaNubeSalesSummary {
  let bruto = 0
  let envio = 0
  for (const order of orders) {
    bruto += order.subtotal - order.discount + order.shippingCost
    envio += order.shippingCost
  }
  return { bruto: Math.round(bruto), envio: Math.round(envio), neto: Math.round(bruto - envio), ordenes: orders.length }
}

export type DailySalesPoint = { date: string; bruto: number; neto: number; ordenes: number }

/** Serie diaria para el gráfico de Facturación Diaria — un punto por cada día que tuvo al menos una orden paga. */
export function groupOrdersByDay(orders: TiendaNubeOrderDetail[]): DailySalesPoint[] {
  const byDay = new Map<string, { bruto: number; envio: number; ordenes: number }>()
  for (const order of orders) {
    const day = order.createdAt.split('T')[0]
    const bucket = byDay.get(day) ?? { bruto: 0, envio: 0, ordenes: 0 }
    bucket.bruto += order.subtotal - order.discount + order.shippingCost
    bucket.envio += order.shippingCost
    bucket.ordenes += 1
    byDay.set(day, bucket)
  }
  return Array.from(byDay.entries())
    .map(([date, b]) => ({ date, bruto: Math.round(b.bruto), neto: Math.round(b.bruto - b.envio), ordenes: b.ordenes }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export type ProductRankingEntry = {
  variantId: number
  productId: number | null
  name: string
  unitsSold: number
  revenue: number
  cost: number
  margin: number
}

export type DeadProductEntry = {
  variantId: number
  productId: number
  name: string
  stock: number
  /** stock × costo cargado — 0 si todavía no se cargó el costo de esta variante (ver hasCost). */
  tiedUpCapital: number
  hasCost: boolean
}

export type ProductRanking = {
  estrella: ProductRankingEntry[]
  /** Inventario inmovilizado real: variantes con stock trackeado por Tienda Nube (stock_management=true) en stock y cero ventas en el período. */
  muertos: DeadProductEntry[]
  /** Costo de producto total del período — suma sobre TODAS las variantes vendidas, no solo el top 5 de "estrella". Alimenta la Cascada de Rentabilidad. */
  totalCogs: number
  /** Suma de tiedUpCapital de todos los "Productos Muertos" con costo cargado — solo cuenta lo que se puede afirmar con datos reales, nunca estima. */
  totalTiedUpCapital: number
  /** true si ninguna variante del catálogo tiene stock_management activado — la tienda no usa el control de stock de Tienda Nube, así que "Productos Muertos" no puede calcularse todavía. */
  stockNotTracked: boolean
}

/**
 * COGS por línea = costo cargado × cantidad, mismo criterio que
 * calcAnCOGS del legado (app.html:12865-12874). "Productos Muertos" ahora sí
 * es inventario inmovilizado real (2026-07-25, ronda de vinculación de
 * stock): antes era "tiene costo cargado y cero ventas" porque no se traía
 * stock de la API; ahora se cruza contra `stock`/`stock_management` reales
 * del catálogo (ver products.ts) — solo cuentan variantes que Tienda Nube
 * efectivamente trackea.
 */
export function rankProducts(
  orders: TiendaNubeOrderDetail[],
  costsByVariant: Map<number, { cost: number; name: string | null }>,
  catalog: { variantId: number; productId: number; productName: string; variantName: string | null; stock: number | null }[]
): ProductRanking {
  const sold = new Map<number, ProductRankingEntry>()

  for (const order of orders) {
    for (const item of order.lineItems) {
      if (item.variantId === null) continue
      const revenue = item.price * item.quantity
      const unitCost = costsByVariant.get(item.variantId)?.cost ?? 0
      const lineCost = unitCost * item.quantity

      const existing = sold.get(item.variantId)
      if (existing) {
        existing.unitsSold += item.quantity
        existing.revenue += revenue
        existing.cost += lineCost
        existing.margin = existing.revenue - existing.cost
      } else {
        sold.set(item.variantId, {
          variantId: item.variantId,
          productId: item.productId,
          name: costsByVariant.get(item.variantId)?.name || item.name,
          unitsSold: item.quantity,
          revenue,
          cost: lineCost,
          margin: revenue - lineCost,
        })
      }
    }
  }

  const totalCogs = Array.from(sold.values()).reduce((sum, entry) => sum + entry.cost, 0)

  const estrella = Array.from(sold.values())
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5)

  const soldVariantIds = new Set(sold.keys())
  const trackedVariants = catalog.filter((v) => v.stock !== null)
  const stockNotTracked = catalog.length > 0 && trackedVariants.length === 0

  const muertos: DeadProductEntry[] = trackedVariants
    .filter((v) => (v.stock as number) > 0 && !soldVariantIds.has(v.variantId))
    .map((v) => {
      const costEntry = costsByVariant.get(v.variantId)
      const cost = costEntry?.cost ?? 0
      const stock = v.stock as number
      return {
        variantId: v.variantId,
        productId: v.productId,
        name: costEntry?.name || `${v.productName}${v.variantName ? ` — ${v.variantName}` : ''}`,
        stock,
        tiedUpCapital: cost * stock,
        hasCost: !!costEntry && cost > 0,
      }
    })
    .sort((a, b) => b.tiedUpCapital - a.tiedUpCapital || b.stock - a.stock)
    .slice(0, 8)

  const totalTiedUpCapital = muertos.reduce((sum, m) => sum + m.tiedUpCapital, 0)

  return { estrella, muertos, totalCogs, totalTiedUpCapital, stockNotTracked }
}

// ---------------------------------------------------------------------------
// Ledger Neto / Radiografía de la Orden (2026-07-25, categorías separadas
// 2026-07-27) — desglose por orden de Bruto/COGS/Envío/Comisión Tienda
// Nube/Comisión Pasarela/Impuestos, más "CPA prorrateado": el spend total de
// Meta Ads del período dividido por la cantidad de órdenes del período,
// repetido igual en cada fila. Es una redistribución explícita del mismo
// número que ya resta la Cascada a nivel agregado (nunca se duplica el
// costo) — no una atribución real por orden, que Tienda Nube no expone.
// ---------------------------------------------------------------------------

export type OrderLedgerEntry = {
  orderId: number
  createdAt: string
  status: string | null
  bruto: number
  cogs: number
  envio: number
  comisionTn: number
  comisionPasarela: number
  impuestos: number
  adsProrated: number
  opexProrated: number
  neto: number
}

/**
 * Los `*Pct` vienen en puntos porcentuales (5 = 5%), mismo criterio que
 * finance.ts. `metaSpendTotal` es el spend de Meta del mismo período que
 * `orders`, ya convertido a la moneda de visualización. `opexTotal` es el
 * total de Costos Fijos (OpEx) ya prorrateado al período (ver page.tsx) —
 * se reparte por orden con el mismo criterio de "prorrateado, no atribuido"
 * que `adsProrated`.
 */
export function buildOrderLedger(
  orders: TiendaNubeOrderDetail[],
  costsByVariant: Map<number, { cost: number; name: string | null }>,
  rates: { comisionTnPct: number; comisionPasarelaPct: number; impuestosPct: number },
  metaSpendTotal: number,
  opexTotal: number
): OrderLedgerEntry[] {
  const adsProrated = orders.length > 0 ? metaSpendTotal / orders.length : 0
  const opexProrated = orders.length > 0 ? opexTotal / orders.length : 0

  return orders
    .map((order) => {
      const bruto = order.subtotal - order.discount + order.shippingCost
      const cogs = order.lineItems.reduce((sum, item) => {
        if (item.variantId === null) return sum
        const unitCost = costsByVariant.get(item.variantId)?.cost ?? 0
        return sum + unitCost * item.quantity
      }, 0)
      const envio = order.shippingCost
      const comisionTn = rates.comisionTnPct ? (bruto * rates.comisionTnPct) / 100 : 0
      const comisionPasarela = rates.comisionPasarelaPct ? (bruto * rates.comisionPasarelaPct) / 100 : 0
      const impuestos = rates.impuestosPct ? (bruto * rates.impuestosPct) / 100 : 0
      const neto = bruto - cogs - envio - comisionTn - comisionPasarela - impuestos - adsProrated - opexProrated

      return {
        orderId: order.id,
        createdAt: order.createdAt,
        status: order.status,
        bruto: Math.round(bruto),
        cogs: Math.round(cogs),
        envio: Math.round(envio),
        comisionTn: Math.round(comisionTn),
        comisionPasarela: Math.round(comisionPasarela),
        impuestos: Math.round(impuestos),
        adsProrated: Math.round(adsProrated),
        opexProrated: Math.round(opexProrated),
        neto: Math.round(neto),
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
