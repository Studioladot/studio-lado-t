import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getPayment } from '@/lib/billing/mercadopago'
import { getPlan } from '@/lib/billing/plans'

// Webhook de Mercado Pago — Meta lo llama server-to-server, sin sesión de
// Gotix detrás (por eso está en PUBLIC_PATHS, ver src/proxy.ts, y usa el
// cliente Service Role, mismo criterio que el Data Deletion Callback de
// Meta en api/meta/data-deletion/route.ts).
//
// REGLA DE SEGURIDAD CENTRAL: nunca se actualiza `organizations` a partir
// del BODY del webhook — cualquiera podría mandar un POST fabricado acá.
// Lo único que se toma del body es el payment id; el pago real (status,
// external_reference, metadata) se vuelve a pedir con nuestro propio
// MERCADOPAGO_ACCESS_TOKEN contra la API de Mercado Pago (getPayment) —
// esa respuesta autenticada es la única fuente de verdad. La verificación
// de firma de abajo (x-signature) es una capa extra de defensa-en-
// profundidad, no la única — el formato exacto de esa firma no se pudo
// verificar contra documentación en vivo de Mercado Pago en esta sesión
// (sin acceso a internet), así que si MERCADOPAGO_WEBHOOK_SECRET no está
// configurada, o la verificación no matchea, el webhook sigue funcionando
// igual apoyado 100% en el re-consultado a la API real — nunca se bloquea
// un pago legítimo por una firma que no se pudo confirmar.
function verifySignature(request: Request, dataId: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) return true // sin secreto configurado, no hay nada que verificar — se apoya en el re-fetch

  const signatureHeader = request.headers.get('x-signature')
  const requestId = request.headers.get('x-request-id')
  if (!signatureHeader || !requestId) return true // headers ausentes: no rompe el flujo, el re-fetch sigue siendo el gate real

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((pair) => {
      const [key, value] = pair.split('=').map((s) => s.trim())
      return [key, value]
    })
  )
  const ts = parts.ts
  const hash = parts.v1
  if (!ts || !hash) return true

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  let body: { type?: string; action?: string; data?: { id?: string } } = {}
  try {
    body = await request.json()
  } catch {
    // Mercado Pago también manda notificaciones IPN viejas por query string
    // — sin body JSON. Se sigue con lo que venga por query.
  }

  const type = body.type ?? url.searchParams.get('topic') ?? ''
  const dataId = body.data?.id ?? url.searchParams.get('id') ?? ''

  // Solo nos interesan eventos de pago — merchant_order/otros se ackean
  // igual con 200 para que MP deje de reintentar, pero no disparan nada.
  if (type !== 'payment' || !dataId) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  // No bloquea el procesamiento (ver comentario arriba) — solo queda
  // registrado si en algún momento se puede confirmar contra un caso real.
  const signatureValid = verifySignature(request, dataId)

  const paymentResult = await getPayment(dataId)
  const supabase = createServiceRoleClient()

  if (!paymentResult.ok) {
    // No podemos confirmar nada — no tocamos organizations. 200 igual para
    // no generar un reintento infinito por un error transitorio nuestro
    // (Mercado Pago reintentará de todos modos por un rato si es 5xx, pero
    // acá el problema es nuestro token/red, no algo que un reintento arregle).
    return NextResponse.json({ ok: false, error: paymentResult.error }, { status: 200 })
  }

  const payment = paymentResult.payment
  const organizationId = payment.external_reference
  const planId = typeof payment.metadata?.plan_id === 'string' ? payment.metadata.plan_id : null
  const plan = planId ? getPlan(planId) : undefined

  await supabase.from('billing_events').insert({
    organization_id: organizationId,
    mp_payment_id: String(payment.id),
    status: payment.status,
    plan: planId,
    amount: payment.transaction_amount,
    raw_payload: { signatureValid, webhookType: type, ...payment } as never,
  })

  if (payment.status === 'approved' && organizationId && plan) {
    await supabase
      .from('organizations')
      .update({ plan: plan.id, trial_ends_at: null })
      .eq('id', organizationId)
  }

  return NextResponse.json({ ok: true })
}

// Mercado Pago a veces valida el endpoint con un GET simple al configurar
// la notification_url — responder 200 evita que lo marque como inválido.
export async function GET() {
  return NextResponse.json({ ok: true })
}
