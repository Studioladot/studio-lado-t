'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { getRequestOrigin } from '@/lib/http/request-origin'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { META_OAUTH_STATE_COOKIE, META_OAUTH_SCOPE } from '@/lib/meta/oauth'
import { TIENDANUBE_OAUTH_STATE_COOKIE } from '@/lib/tiendanube/oauth'
import { TIKTOK_OAUTH_STATE_COOKIE, TIKTOK_OAUTH_VERIFIER_COOKIE, TIKTOK_OAUTH_SCOPE, TIKTOK_AUTH_URL } from '@/lib/tiktok/oauth'
import { generatePkcePair } from '@/lib/tiktok/pkce'

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function connectMetaAction() {
  const appId = process.env.META_APP_ID

  if (!appId) {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent('Meta Ads no está configurado todavía.'))
  }

  // CSRF: state aleatorio guardado en cookie de corta duración, verificado
  // en el callback antes de confiar en el "code" que devuelve Meta.
  const state = randomBytes(24).toString('hex')
  const cookieStore = await cookies()
  cookieStore.set(META_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  })

  const origin = await getRequestOrigin()
  const redirectUri = `${origin}/api/meta/callback`

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: META_OAUTH_SCOPE,
    state,
    response_type: 'code',
  })

  redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`)
}

export async function connectTiendaNubeAction() {
  const clientId = process.env.TIENDANUBE_CLIENT_ID

  if (!clientId) {
    redirect('/settings/integrations?tn_error=' + encodeURIComponent('Tienda Nube no está configurado todavía.'))
  }

  // Tienda Nube no acepta redirect_uri por request — se configura una sola
  // vez en el panel de la app en Tienda Nube Partners. El state sigue
  // siendo nuestra única defensa CSRF acá.
  const state = randomBytes(24).toString('hex')
  const cookieStore = await cookies()
  cookieStore.set(TIENDANUBE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  })

  redirect(`https://www.tiendanube.com/apps/${clientId}/authorize?state=${state}`)
}

/**
 * Fase 2 de la Épica Omnicanal (2026-08-04) — mismo shell que
 * connectMetaAction, pero contra el Login Kit v2 de TikTok
 * (src/lib/tiktok/oauth.ts). client_key no es secreto (viaja en la URL de
 * autorización, igual que META_APP_ID); client_secret solo se usa en el
 * intercambio server-to-server dentro de api/auth/tiktok/callback/route.ts.
 */
export async function connectTiktokAction() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  // A diferencia de Meta, el panel de TikTok for Developers no aceptó
  // registrar un Redirect URI de localhost para esta app (2026-08-05) — el
  // valor tiene que ser fijo y coincidir carácter por carácter con lo que
  // está guardado ahí (mismo criterio que ya usa Tiendanube acá abajo:
  // "no acepta redirect_uri por request"). api/auth/tiktok/callback/route.ts
  // usa este mismo valor en el intercambio por el token — si cambia acá,
  // tiene que cambiar ahí también.
  const redirectUri = process.env.TIKTOK_REDIRECT_URI

  if (!clientKey || !redirectUri) {
    redirect('/settings/integrations?tiktok_error=' + encodeURIComponent('TikTok no está configurado todavía.'))
  }

  // redirect() lanza internamente un NEXT_REDIRECT para cortar la
  // ejecución — por eso ambas llamadas a redirect() de esta función quedan
  // FUERA de este try/catch (atraparlo por error lo convertiría en un
  // "error inesperado" y rompería la navegación). Lo único que este bloque
  // protege es la construcción de la URL (cookies()/headers()), que en
  // teoría no debería tirar, pero si lo hiciera antes esto se colaba como
  // un 500 crudo en vez de un banner legible en /settings/integrations.
  let authUrl: string
  try {
    const state = randomBytes(24).toString('hex')
    // PKCE: TikTok rechaza /v2/auth/authorize/ sin code_challenge (a
    // diferencia de Meta/Tiendanube). El code_verifier viaja en su propia
    // cookie de corta duración, igual que el state, y se lee de vuelta en
    // api/auth/tiktok/callback/route.ts para el intercambio por el token.
    const { codeVerifier, codeChallenge } = generatePkcePair()

    const cookieStore = await cookies()
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10,
    }
    cookieStore.set(TIKTOK_OAUTH_STATE_COOKIE, state, cookieOptions)
    cookieStore.set(TIKTOK_OAUTH_VERIFIER_COOKIE, codeVerifier, cookieOptions)

    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: redirectUri,
      scope: TIKTOK_OAUTH_SCOPE,
      state,
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    authUrl = `${TIKTOK_AUTH_URL}?${params}`
  } catch (err) {
    redirect(
      '/settings/integrations?tiktok_error=' +
        encodeURIComponent(err instanceof Error ? err.message : 'Error desconocido al iniciar la conexión con TikTok.')
    )
  }

  redirect(authUrl)
}

export async function disconnectMetaAction() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return
  }

  const supabase = await createClient()
  await supabase.from('meta_connections').delete().eq('organization_id', activeOrganizationId)

  redirect('/settings/integrations')
}

/**
 * Independiente de disconnectMetaAction a propósito — Instagram y Meta Ads
 * son conexiones separadas (una organización puede tener una sin la otra,
 * ver arquitectura de instagram_connections). Desconectar Ads no debe
 * arrastrar Instagram ni viceversa.
 */
export async function disconnectInstagramAction() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return
  }

  const supabase = await createClient()
  await supabase.from('instagram_connections').delete().eq('organization_id', activeOrganizationId)

  redirect('/settings/integrations')
}

export async function disconnectTiendaNubeAction() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return
  }

  const supabase = await createClient()
  await supabase.from('tiendanube_connections').delete().eq('organization_id', activeOrganizationId)

  redirect('/settings/integrations')
}

export async function disconnectTiktokAction() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return
  }

  const supabase = await createClient()
  await supabase.from('tiktok_connections').delete().eq('organization_id', activeOrganizationId)

  redirect('/settings/integrations')
}
