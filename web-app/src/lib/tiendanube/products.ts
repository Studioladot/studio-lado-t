const USER_AGENT = 'GOTIX (contacto@gotix.app)'

// Catálogo de Tienda Nube — solo para resolver nombre/imagen por variante:
// alimenta el selector de "Costo de Producto" (el usuario tiene que poder
// elegir la variante por nombre, no tipear un variant_id a ciegas) y cachea
// el nombre resuelto en product_costs.product_name la primera vez que se
// carga un costo (ver product-costs.ts).

export type TiendaNubeProductVariant = {
  variantId: number
  productId: number
  productName: string
  variantName: string | null
  imageUrl: string | null
  /** null = Tienda Nube no gestiona stock para esta variante (stock_management=false, "ilimitado") — no se puede afirmar inventario inmovilizado sin este dato, así que rankProducts (orders.ts) descarta esas variantes de "Productos Muertos" en vez de asumir 0. */
  stock: number | null
}

export type TiendaNubeProductsResult = { ok: true; variants: TiendaNubeProductVariant[] } | { ok: false; error: string }

type RawVariant = {
  id: number
  stock?: number | string | null
  stock_management?: boolean
  values?: Array<Record<string, string>>
}

type RawProduct = {
  id: number
  name?: Record<string, string>
  images?: Array<{ src?: string }>
  variants?: RawVariant[]
}

function firstLocalized(value: Record<string, string> | undefined, fallback: string): string {
  if (!value) return fallback
  return value.es ?? Object.values(value)[0] ?? fallback
}

/**
 * Trae el catálogo completo (nombre + imagen por producto, aplanado a nivel
 * variante). Catálogos son chicos frente al volumen de órdenes — 10 páginas
 * alcanzan de sobra.
 *
 * Mismo fix de performance que getTiendaNubeOrders (orders.ts, 2026-08-21) —
 * de a BATCH_SIZE páginas en paralelo en vez de una por una, mismo criterio
 * de corte (página corta/vacía/404 = no hay más).
 */
export async function getTiendaNubeProducts(accessToken: string, storeId: string): Promise<TiendaNubeProductsResult> {
  const MAX_PAGES = 10
  const BATCH_SIZE = 5

  try {
    let allProducts: RawProduct[] = []
    let page = 1
    let hasMore = true

    while (hasMore && page <= MAX_PAGES) {
      const pagesToFetch: number[] = []
      for (let i = 0; i < BATCH_SIZE && page + i <= MAX_PAGES; i++) {
        pagesToFetch.push(page + i)
      }

      const responses = await Promise.all(
        pagesToFetch.map((p) =>
          fetch(`https://api.tiendanube.com/v1/${storeId}/products?per_page=200&page=${p}`, {
            headers: {
              Authentication: `bearer ${accessToken}`,
              'User-Agent': USER_AGENT,
            },
          })
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

        const products: RawProduct[] = await res.json()
        if (!Array.isArray(products) || products.length === 0) {
          hasMore = false
          break
        }

        allProducts = allProducts.concat(products)
        if (products.length < 200) {
          hasMore = false
          break
        }
      }

      page += pagesToFetch.length
    }

    const variants: TiendaNubeProductVariant[] = []
    for (const product of allProducts) {
      const productName = firstLocalized(product.name, 'Producto sin nombre')
      const imageUrl = product.images?.[0]?.src ?? null
      for (const variant of product.variants ?? []) {
        const variantValues = variant.values?.map((v) => firstLocalized(v, '')).filter(Boolean) ?? []
        const stock = variant.stock_management && variant.stock !== undefined && variant.stock !== null ? Number(variant.stock) : null
        variants.push({
          variantId: variant.id,
          productId: product.id,
          productName,
          variantName: variantValues.length > 0 ? variantValues.join(' / ') : null,
          imageUrl,
          stock,
        })
      }
    }

    return { ok: true, variants }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red.' }
  }
}
