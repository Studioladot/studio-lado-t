const USER_AGENT = 'GOTIX (contacto@gotix.app)'

// Embudo real de Tienda Nube (2026-07-25, ronda de corrección) — el recurso
// público "Abandoned Checkouts" (`GET /checkouts`, confirmado contra la
// documentación oficial de Tiendanube: tiendanube.github.io/api-documentation
// /resources/abandoned-checkout) SÍ existe y usa el mismo permiso
// `read_orders` que ya tenemos para /orders — la ronda anterior descartó este
// embudo por error, asumiendo que no había endpoint público sin chequear la
// documentación real. `completed_at` es la señal de conversión: null = todavía
// abandonado, con fecha = se cerró en una venta.

export type TiendaNubeCheckoutLineItem = {
  variantId: number | null
  productId: number | null
  name: string
  quantity: number
  price: number
}

export type TiendaNubeCheckout = {
  id: number
  createdAt: string
  completedAt: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  total: number
  currency: string | null
  lineItems: TiendaNubeCheckoutLineItem[]
}

/** `truncated: true` = se llegó al tope de 20 páginas (4000 carritos) con la tienda todavía teniendo más — mismo criterio que TiendaNubeOrdersFetchResult en orders.ts. */
export type TiendaNubeCheckoutsFetchResult =
  | { ok: true; checkouts: TiendaNubeCheckout[]; truncated: boolean }
  | { ok: false; error: string }

type RawLineItem = {
  variant_id?: number | null
  product_id?: number | null
  name?: string
  quantity?: number | string
  price?: string
}

type RawCheckout = {
  id: number
  created_at?: string
  completed_at?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  total?: string
  currency?: string | null
  products?: RawLineItem[]
}

/**
 * Trae los checkouts (carritos, abandonados o convertidos) del rango pedido —
 * mismo patrón de paginación que getTiendaNubeOrders. `since`/`until`
 * explícitos (no un `days` relativo a "hoy"), mismo motivo que orders.ts:
 * soportar el selector de rango de fechas personalizado.
 */
export async function getTiendaNubeCheckouts(
  accessToken: string,
  storeId: string,
  since: Date,
  until: Date
): Promise<TiendaNubeCheckoutsFetchResult> {
  const sinceISO = since.toISOString()
  const untilISO = until.toISOString()

  // Mismo fix de performance que getTiendaNubeOrders (orders.ts,
  // 2026-08-21) — de a BATCH_SIZE páginas en paralelo en vez de una por
  // una, mismo criterio de corte (página corta/vacía/404 = no hay más).
  const MAX_PAGES = 20
  const BATCH_SIZE = 5

  try {
    let allCheckouts: RawCheckout[] = []
    let page = 1
    let hasMore = true

    while (hasMore && page <= MAX_PAGES) {
      const pagesToFetch: number[] = []
      for (let i = 0; i < BATCH_SIZE && page + i <= MAX_PAGES; i++) {
        pagesToFetch.push(page + i)
      }

      const responses = await Promise.all(
        pagesToFetch.map((p) =>
          fetch(
            `https://api.tiendanube.com/v1/${storeId}/checkouts?created_at_min=${sinceISO}&created_at_max=${untilISO}&per_page=200&page=${p}`,
            {
              headers: {
                Authentication: `bearer ${accessToken}`,
                'User-Agent': USER_AGENT,
              },
            }
          )
        )
      )

      for (const res of responses) {
        if (!res.ok) {
          if (res.status === 404) {
            hasMore = false
            break
          }
          const errBody = await res.text()
          return { ok: false, error: `Tienda Nube respondió con error ${res.status}: ${errBody}` }
        }

        const checkouts: RawCheckout[] = await res.json()
        if (!Array.isArray(checkouts) || checkouts.length === 0) {
          hasMore = false
          break
        }

        allCheckouts = allCheckouts.concat(checkouts)
        if (checkouts.length < 200) {
          hasMore = false
          break
        }
      }

      page += pagesToFetch.length
    }

    const checkouts: TiendaNubeCheckout[] = allCheckouts.map((c) => ({
      id: c.id,
      createdAt: c.created_at ?? new Date().toISOString(),
      completedAt: c.completed_at ?? null,
      contactName: c.contact_name ?? null,
      contactEmail: c.contact_email ?? null,
      contactPhone: c.contact_phone ?? null,
      total: parseFloat(c.total || '0'),
      currency: c.currency ?? null,
      lineItems: (c.products ?? []).map((p) => ({
        variantId: p.variant_id ?? null,
        productId: p.product_id ?? null,
        name: p.name ?? 'Sin nombre',
        quantity: Number(p.quantity ?? 0),
        price: parseFloat(p.price || '0'),
      })),
    }))

    return { ok: true, checkouts, truncated: hasMore }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red.' }
  }
}

export type CheckoutFunnelSummary = {
  carritosCreados: number
  ventasCerradas: number
  abandonados: number
  tasaConversion: number
}

export function summarizeCheckouts(checkouts: TiendaNubeCheckout[]): CheckoutFunnelSummary {
  const carritosCreados = checkouts.length
  const ventasCerradas = checkouts.filter((c) => c.completedAt !== null).length
  const abandonados = carritosCreados - ventasCerradas
  const tasaConversion = carritosCreados > 0 ? (ventasCerradas / carritosCreados) * 100 : 0
  return { carritosCreados, ventasCerradas, abandonados, tasaConversion }
}

/** Los N carritos abandonados más recientes (completed_at null), para la lista accionable con datos de contacto. */
export function getRecentAbandonedCheckouts(checkouts: TiendaNubeCheckout[], limit = 10): TiendaNubeCheckout[] {
  return checkouts
    .filter((c) => c.completedAt === null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
}

export type ApplyCouponResult = { ok: true } | { ok: false; error: string }

/**
 * Aplica un cupón existente a un carrito abandonado (POST /checkouts/{id}/coupon,
 * body {coupon_id}, confirmado contra la documentación oficial). Requiere que
 * el cupón ya exista en Tienda Nube (esta API no crea cupones nuevos) y que el
 * checkout no tenga uno asignado todavía (Tienda Nube devuelve 422 si ya tiene).
 */
export async function applyCheckoutCoupon(
  accessToken: string,
  storeId: string,
  checkoutId: number,
  couponId: number
): Promise<ApplyCouponResult> {
  try {
    const res = await fetch(`https://api.tiendanube.com/v1/${storeId}/checkouts/${checkoutId}/coupon`, {
      method: 'POST',
      headers: {
        Authentication: `bearer ${accessToken}`,
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coupon_id: couponId }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      return { ok: false, error: `Tienda Nube respondió con error ${res.status}: ${errBody}` }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red.' }
  }
}
