'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { getRequestOrigin } from '@/lib/http/request-origin'
import { META_OAUTH_STATE_COOKIE, META_OAUTH_SCOPE } from '@/lib/meta/oauth'
import { TIENDANUBE_OAUTH_STATE_COOKIE } from '@/lib/tiendanube/oauth'

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function connectMetaAction() {
  const appId = process.env.META_APP_ID

  if (!appId) {
    redirect('/dashboard?meta_error=' + encodeURIComponent('Meta Ads no está configurado todavía.'))
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
    redirect('/dashboard?tn_error=' + encodeURIComponent('Tienda Nube no está configurado todavía.'))
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
