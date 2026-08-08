// Cliente de Mercado Pago — Checkout Pro, vía fetch directo a su API REST
// (mismo criterio "cero dependencias nuevas" que ya usa el resto del
// proyecto para Meta/TikTok/DeepSeek: no hace falta el SDK oficial de
// Node para 2 llamados). Server-only — MERCADOPAGO_ACCESS_TOKEN nunca debe
// viajar al cliente ni imprimirse en logs.
//
// Referencia: https://www.mercadopago.com.ar/developers/es/reference/preferences/_checkout_preferences/post
const MP_API_BASE = 'https://api.mercadopago.com'

export type CreatePreferenceParams = {
  organizationId: string
  planId: string
  planName: string
  price: number
  payerEmail: string
  successUrl: string
  failureUrl: string
  pendingUrl: string
  notificationUrl: string
}

export type CreatePreferenceResult = { ok: true; initPoint: string; preferenceId: string } | { ok: false; error: string }

export async function createCheckoutPreference(params: CreatePreferenceParams): Promise<CreatePreferenceResult> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) return { ok: false, error: 'Mercado Pago no está configurado en el servidor.' }

  const res = await fetch(`${MP_API_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          title: `Gotix — ${params.planName}`,
          quantity: 1,
          unit_price: params.price,
          currency_id: 'ARS',
        },
      ],
      payer: { email: params.payerEmail },
      // external_reference es cómo el webhook sabe a qué organización
      // corresponde el pago — metadata.plan_id es a qué plan pasarla.
      external_reference: params.organizationId,
      metadata: { organization_id: params.organizationId, plan_id: params.planId },
      back_urls: {
        success: params.successUrl,
        failure: params.failureUrl,
        pending: params.pendingUrl,
      },
      auto_return: 'approved',
      notification_url: params.notificationUrl,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return { ok: false, error: `Mercado Pago rechazó la preferencia de pago (${res.status}). ${detail}`.trim() }
  }

  const data = (await res.json()) as { id?: string; init_point?: string }
  if (!data.init_point || !data.id) {
    return { ok: false, error: 'Mercado Pago no devolvió un link de pago válido.' }
  }

  return { ok: true, initPoint: data.init_point, preferenceId: data.id }
}

export type MpPayment = {
  id: number
  status: string
  external_reference: string | null
  transaction_amount: number | null
  metadata: Record<string, unknown> | null
}

/**
 * Re-consulta un pago DIRECTO contra la API de Mercado Pago con nuestro
 * propio access token — la única fuente de verdad real. El webhook nunca
 * actualiza `organizations` a partir de su propio body (fácil de falsear),
 * siempre valida acá primero (ver api/mercadopago/webhook/route.ts).
 */
export async function getPayment(paymentId: string): Promise<{ ok: true; payment: MpPayment } | { ok: false; error: string }> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) return { ok: false, error: 'Mercado Pago no está configurado en el servidor.' }

  const res = await fetch(`${MP_API_BASE}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) return { ok: false, error: `No pudimos confirmar el pago contra Mercado Pago (${res.status}).` }

  const payment = (await res.json()) as MpPayment
  return { ok: true, payment }
}
