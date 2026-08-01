'use client'

import { useState } from 'react'
import { applyCheckoutCouponAction } from './actions'
import type { TiendaNubeCheckout } from '@/lib/tiendanube/checkouts'
import type { TiendaNubeCoupon } from '@/lib/tiendanube/coupons'

// Carritos Abandonados Recientes — a diferencia del resto de la página, esto
// no es solo lectura: "Aplicar cupón" manda un descuento real a un cliente
// real vía la API de Tienda Nube (POST /checkouts/{id}/coupon), así que cada
// fila pide confirmación explícita antes de disparar la acción (mismo
// criterio que ConfirmSubmitButton, pero acá no puede ser un <form action=
// server-action> plano porque el cupón elegido es estado local por fila).

function money(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

function daysAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  return `hace ${days} días`
}

function couponLabel(c: TiendaNubeCoupon): string {
  const suffix = c.type === 'percentage' ? `${c.value}%` : c.type === 'absolute' ? money(Number(c.value)) : c.value
  return `${c.code} (${suffix})`
}

function CartRow({ checkout, coupons }: { checkout: TiendaNubeCheckout; coupons: TiendaNubeCoupon[] }) {
  const [couponId, setCouponId] = useState('')
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleApply() {
    if (!couponId) return
    const coupon = coupons.find((c) => c.id === Number(couponId))
    if (!coupon) return
    if (!window.confirm(`¿Aplicar el cupón "${coupon.code}" a este carrito? Se envía un descuento real al cliente.`)) return

    setApplying(true)
    setResult(null)
    const res = await applyCheckoutCouponAction(checkout.id, Number(couponId))
    setApplying(false)
    setResult(res.ok ? { ok: true, message: 'Cupón aplicado.' } : { ok: false, message: res.error })
  }

  return (
    <li className="flex flex-col gap-2 rounded-control border border-border bg-surface-2/60 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-text">{checkout.contactName || checkout.contactEmail || 'Sin datos de contacto'}</p>
        <p className="text-[11px] text-text-3">
          {checkout.contactEmail ?? 'sin email'}
          {checkout.contactPhone ? ` — ${checkout.contactPhone}` : ''} · {daysAgo(checkout.createdAt)} · {checkout.lineItems.length} producto
          {checkout.lineItems.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <p className="tabular-nums text-xs font-semibold text-text">{money(checkout.total)}</p>
        {coupons.length === 0 ? (
          <span className="text-[10px] text-text-3">Sin cupones activos</span>
        ) : (
          <>
            <select
              value={couponId}
              onChange={(e) => setCouponId(e.target.value)}
              className="rounded-control border border-border bg-surface px-2 py-1.5 text-[11px] text-text outline-none transition-all duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent"
            >
              <option value="">Elegí un cupón…</option>
              {coupons.map((c) => (
                <option key={c.id} value={c.id}>
                  {couponLabel(c)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!couponId || applying}
              onClick={handleApply}
              className="shrink-0 rounded-control border border-accent/30 bg-accent/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-accent transition-all duration-200 ease-out hover:bg-accent/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applying ? 'Aplicando…' : 'Aplicar cupón'}
            </button>
          </>
        )}
      </div>
      {result && <p className={`w-full text-[11px] sm:text-right ${result.ok ? 'text-green' : 'text-red'}`}>{result.message}</p>}
    </li>
  )
}

export function AbandonedCartsList({ checkouts, coupons }: { checkouts: TiendaNubeCheckout[]; coupons: TiendaNubeCoupon[] }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-text-3">Carritos Abandonados Recientes</p>
      <p className="mb-3 text-[11px] text-text-3">
        Checkouts iniciados y no convertidos en venta — datos reales de Tienda Nube (GET /checkouts).
      </p>
      {checkouts.length === 0 ? (
        <p className="text-center text-xs text-text-3">Sin carritos abandonados en el período — o todavía no conectaste Tienda Nube.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {checkouts.map((c) => (
            <CartRow key={c.id} checkout={c} coupons={coupons} />
          ))}
        </ul>
      )}
    </div>
  )
}
