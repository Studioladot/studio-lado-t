const USER_AGENT = 'GOTIX (contacto@gotix.app)'

export type TiendaNubeSalesSummary = {
  bruto: number
  envio: number
  neto: number
  ordenes: number
}

export type TiendaNubeOrdersResult =
  | { ok: true; summary: TiendaNubeSalesSummary }
  | { ok: false; error: string }

type TiendaNubeOrder = {
  id: number
  status?: string
  payment_status?: string
  subtotal?: string
  discount?: string
  shipping_cost_customer?: string
}

/**
 * Resumen de ventas de los últimos 30 días (mismo cálculo de bruto/envío/neto
 * que app.html:tiendanube-orders.js, pero sin el rango de fechas
 * personalizado, la caché, ni la analítica avanzada (carritos abandonados,
 * top productos, productos muertos) — eso queda para una pasada futura si
 * hace falta.
 */
export async function getTiendaNubeSalesSummary(
  accessToken: string,
  storeId: string
): Promise<TiendaNubeOrdersResult> {
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceISO = since.toISOString()
  const untilISO = new Date().toISOString()

  try {
    let allOrders: TiendaNubeOrder[] = []
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

      const orders: TiendaNubeOrder[] = await res.json()
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

    let bruto = 0
    let envio = 0

    for (const order of paidOrders) {
      const subtotal = parseFloat(order.subtotal || '0')
      const discount = parseFloat(order.discount || '0')
      const shippingCost = parseFloat(order.shipping_cost_customer || '0')
      bruto += subtotal - discount + shippingCost
      envio += shippingCost
    }

    return {
      ok: true,
      summary: {
        bruto: Math.round(bruto),
        envio: Math.round(envio),
        neto: Math.round(bruto - envio),
        ordenes: paidOrders.length,
      },
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red.' }
  }
}
