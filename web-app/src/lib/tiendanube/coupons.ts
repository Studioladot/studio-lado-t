const USER_AGENT = 'GOTIX (contacto@gotix.app)'

// Cupones de Tienda Nube — solo lectura, para poblar el selector de "Aplicar
// cupón" sobre un carrito abandonado (ver checkouts.ts: applyCheckoutCoupon
// necesita un coupon_id que ya exista, esta API no crea cupones nuevos).

export type TiendaNubeCoupon = {
  id: number
  code: string
  type: 'percentage' | 'absolute' | 'shipping' | string
  value: string
}

export type TiendaNubeCouponsResult = { ok: true; coupons: TiendaNubeCoupon[] } | { ok: false; error: string }

type RawCoupon = {
  id: number
  code?: string
  type?: string
  value?: string
}

/** Trae solo cupones vigentes (valid=true) — no tiene sentido ofrecer uno vencido/agotado en el selector. */
export async function getTiendaNubeCoupons(accessToken: string, storeId: string): Promise<TiendaNubeCouponsResult> {
  try {
    const res = await fetch(`https://api.tiendanube.com/v1/${storeId}/coupons?valid=true&per_page=200`, {
      headers: {
        Authentication: `bearer ${accessToken}`,
        'User-Agent': USER_AGENT,
      },
    })

    if (!res.ok) {
      if (res.status === 404) return { ok: true, coupons: [] }
      const errBody = await res.text()
      return { ok: false, error: `Tienda Nube respondió con error ${res.status}: ${errBody}` }
    }

    const raw: RawCoupon[] = await res.json()
    const coupons: TiendaNubeCoupon[] = (Array.isArray(raw) ? raw : []).map((c) => ({
      id: c.id,
      code: c.code ?? `Cupón ${c.id}`,
      type: c.type ?? 'percentage',
      value: c.value ?? '0',
    }))

    return { ok: true, coupons }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red.' }
  }
}
