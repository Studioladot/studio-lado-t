import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// Data Deletion Request Callback — requisito de Meta App Review para
// cualquier app con permisos "avanzados" (instagram_content_publish,
// instagram_manage_insights) en modo Live/Público. Meta llama este
// endpoint server-to-server (sin sesión de Gotix) cuando un usuario pide el
// borrado de sus datos desde la configuración de su cuenta de Facebook —
// por eso está en PUBLIC_PATHS (ver src/proxy.ts) y usa el cliente Service
// Role en vez del cliente de sesión normal.
//
// Contrato exacto que exige Meta:
// https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/
// 1. Verificar la firma HMAC-SHA256 del signed_request contra el app secret
//    — esto ES la autenticación de este endpoint (no hay login posible acá).
// 2. Devolver { url, confirmation_code } con 200 si la firma es válida.
// 3. `url` tiene que ser una página real donde el usuario pueda ver el
//    estado de su solicitud (ver src/app/data-deletion-status/page.tsx).

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

type SignedRequestPayload = { algorithm?: string; issued_at?: number; user_id?: string }

function parseSignedRequest(signedRequest: string, appSecret: string): SignedRequestPayload | null {
  const parts = signedRequest.split('.')
  if (parts.length !== 2) return null
  const [encodedSig, encodedPayload] = parts

  const expectedSig = crypto.createHmac('sha256', appSecret).update(encodedPayload).digest()
  const actualSig = base64UrlDecode(encodedSig)

  if (expectedSig.length !== actualSig.length || !crypto.timingSafeEqual(expectedSig, actualSig)) {
    return null
  }

  try {
    return JSON.parse(base64UrlDecode(encodedPayload).toString('utf8')) as SignedRequestPayload
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) {
    return NextResponse.json({ error: 'App no configurada.' }, { status: 500 })
  }

  const formData = await request.formData()
  const signedRequest = formData.get('signed_request')

  if (typeof signedRequest !== 'string') {
    return NextResponse.json({ error: 'Falta signed_request.' }, { status: 400 })
  }

  const payload = parseSignedRequest(signedRequest, appSecret)
  if (!payload?.user_id) {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 })
  }

  const fbUserId = payload.user_id
  const confirmationCode = crypto.randomUUID()
  const supabase = createServiceRoleClient()

  await supabase.from('data_deletion_requests').insert({
    fb_user_id: fbUserId,
    confirmation_code: confirmationCode,
    status: 'received',
  })

  // El borrado es inmediato y síncrono acá — no hay ninguna cola de trabajo
  // detrás, así que no tiene sentido fingir un estado "en progreso" más
  // allá de este mismo request. Se borra de las dos tablas que guardan
  // tokens; cualquier organización que haya conectado esa identidad de
  // Facebook pierde la conexión (agencias con varios clientes pueden tener
  // más de una fila afectada, es esperable).
  await Promise.all([
    supabase.from('meta_connections').delete().eq('fb_user_id', fbUserId),
    supabase.from('instagram_connections').delete().eq('fb_user_id', fbUserId),
  ])

  await supabase
    .from('data_deletion_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('confirmation_code', confirmationCode)

  const { origin } = new URL(request.url)
  return NextResponse.json({
    url: `${origin}/data-deletion-status?id=${confirmationCode}`,
    confirmation_code: confirmationCode,
  })
}
