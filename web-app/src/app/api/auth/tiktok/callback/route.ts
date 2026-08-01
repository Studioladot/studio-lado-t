import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { TIKTOK_OAUTH_STATE_COOKIE, TIKTOK_OAUTH_VERIFIER_COOKIE, TIKTOK_TOKEN_URL, TIKTOK_USER_INFO_URL } from '@/lib/tiktok/oauth'
import { saveTiktokConnection } from '@/lib/tiktok/connections'

// Mismo shape que api/meta/callback/route.ts: valida state, intercambia el
// code, resuelve identidad, guarda la conexión. TikTok devuelve el token en
// un solo paso (no hay short-lived → long-lived como en Meta) pero sí trae
// refresh_token real, a diferencia de Meta.
//
// Ruta bajo /api/auth/tiktok/callback (no /api/tiktok/callback, a
// diferencia del resto de las integraciones de este proyecto) porque el
// Redirect URI de una app de TikTok no se resuelve dinámicamente por
// request (a diferencia de Meta) — cada URL que se use tiene que estar
// registrada de antemano, tal cual, en el panel de TikTok for Developers,
// y ese panel no aceptó localhost para esta app (2026-08-05). Por eso
// TIKTOK_REDIRECT_URI (leída acá abajo y en connectTiktokAction,
// (dashboard)/actions.ts) es una env var y no un valor fijo en el código:
// en local/Preview de Vercel apunta a la URL que se haya registrado para
// ese entorno de prueba, en producción a https://gotix.com.ar/api/auth/tiktok/callback
// — la ruta /api/auth/tiktok/callback tiene que existir igual en todos
// para que el path coincida con lo que sea que esté registrado en cada
// caso. Los dos lados (autorización acá y el intercambio por el token más
// abajo) tienen que usar el mismo valor exacto — TikTok también valida que
// el redirect_uri del token exchange coincida con el de la autorización.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const redirectWithError = (message: string) =>
    NextResponse.redirect(`${origin}/settings/integrations?tiktok_error=${encodeURIComponent(message)}`)

  if (oauthError) {
    return redirectWithError('Conexión cancelada.')
  }

  if (!code || !state) {
    return redirectWithError('Falta code o state en la respuesta de TikTok.')
  }

  const cookieStore = await cookies()
  const expectedState = cookieStore.get(TIKTOK_OAUTH_STATE_COOKIE)?.value
  const codeVerifier = cookieStore.get(TIKTOK_OAUTH_VERIFIER_COOKIE)?.value
  cookieStore.delete(TIKTOK_OAUTH_STATE_COOKIE)
  cookieStore.delete(TIKTOK_OAUTH_VERIFIER_COOKIE)

  if (!expectedState || expectedState !== state) {
    return redirectWithError('El estado de la conexión no es válido — probá de nuevo.')
  }

  if (!codeVerifier) {
    return redirectWithError('Falta el code_verifier de PKCE — probá conectar de nuevo desde el principio.')
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  const redirectUri = process.env.TIKTOK_REDIRECT_URI

  if (!clientKey || !clientSecret || !redirectUri) {
    return redirectWithError('TikTok no está configurado todavía.')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return redirectWithError('No encontramos tu organización activa.')
  }

  try {
    const tokenRes = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      // Diagnóstico temporal (2026-08-01) — "Client key or secret is
      // incorrect" persistió después de recargar las env vars en Vercel
      // varias veces. En vez de seguir adivinando, esto expone el LARGO de
      // cada valor tal como Vercel los está leyendo ahora mismo, y si
      // tienen espacios/saltos de línea de más — nunca el valor real. Sacar
      // este bloque en cuanto se resuelva, no debe quedar en producción.
      const diag = `clientKey: ${clientKey.length} chars${clientKey !== clientKey.trim() ? ' (con espacios de más!)' : ''} · clientSecret: ${clientSecret.length} chars${clientSecret !== clientSecret.trim() ? ' (con espacios de más!)' : ''} · redirectUri: "${redirectUri}"`
      return redirectWithError(`${tokenData.error_description || tokenData.error} — DIAG: ${diag}`)
    }

    const accessToken: string = tokenData.access_token
    const refreshToken: string = tokenData.refresh_token
    const openId: string = tokenData.open_id
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    // user.info.basic ya alcanza para username/avatar — no hace falta
    // ningún scope de video acá, solo se usa para mostrar la conexión en
    // /settings/integrations.
    const userInfoRes = await fetch(
      `${TIKTOK_USER_INFO_URL}?fields=open_id,username,avatar_url`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const userInfoData = await userInfoRes.json()
    const tiktokUser = userInfoData?.data?.user

    const saved = await saveTiktokConnection(supabase, {
      organizationId: activeOrganizationId,
      tiktokOpenId: tiktokUser?.open_id ?? openId,
      tiktokUsername: tiktokUser?.username ?? null,
      avatarUrl: tiktokUser?.avatar_url ?? null,
      accessToken,
      refreshToken,
      expiresAt,
    })

    if (!saved.ok) return redirectWithError(`No pudimos guardar la conexión: ${saved.error}`)

    return NextResponse.redirect(`${origin}/settings/integrations?tiktok_connected=1`)
  } catch (err) {
    return redirectWithError(err instanceof Error ? err.message : 'Error desconocido.')
  }
}
