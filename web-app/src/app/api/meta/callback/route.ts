import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { META_OAUTH_STATE_COOKIE, META_OAUTH_PENDING_COOKIE, INSTAGRAM_OAUTH_PENDING_COOKIE, META_GRAPH_URL } from '@/lib/meta/oauth'
import { getMetaAdAccounts, getFacebookUserId } from '@/lib/meta/accounts'
import { saveMetaConnection } from '@/lib/meta/connections'
import { getInstagramBusinessAccounts } from '@/lib/instagram/accounts'
import { saveInstagramConnection } from '@/lib/instagram/connections'

const PENDING_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 10,
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  // Las cookies "pending" (selección de cuenta publicitaria / de Instagram)
  // se acumulan acá y se atan recién al NextResponse concreto que devuelve
  // esta función — este handler construye varios NextResponse.redirect()
  // distintos según la rama, y mutar cookieStore de forma ambiental (vía
  // cookies() de next/headers) no garantiza que el Set-Cookie quede
  // pegado al que finalmente se devuelve. Ese desacople era el bug real
  // detrás de "La selección expiró" en producción — el patrón explícito de
  // abajo es el mismo que ya funciona en src/proxy.ts.
  const pendingCookies: { name: string; value: string }[] = []

  const redirect = (url: string) => {
    const response = NextResponse.redirect(url)
    response.cookies.delete(META_OAUTH_STATE_COOKIE)
    for (const cookie of pendingCookies) {
      response.cookies.set(cookie.name, cookie.value, PENDING_COOKIE_OPTIONS)
    }
    return response
  }

  const redirectWithError = (message: string) =>
    redirect(`${origin}/settings/integrations?meta_error=${encodeURIComponent(message)}`)

  if (oauthError) {
    return redirectWithError('Conexión cancelada.')
  }

  if (!code || !state) {
    return redirectWithError('No pudimos completar la conexión con Meta. Probá de nuevo.')
  }

  const cookieStore = await cookies()
  const expectedState = cookieStore.get(META_OAUTH_STATE_COOKIE)?.value

  if (!expectedState || expectedState !== state) {
    return redirectWithError('No pudimos verificar la conexión con Meta — probá de nuevo.')
  }

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  if (!appId || !appSecret) {
    return redirectWithError('Meta Ads no está configurado todavía.')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect(`${origin}/login`)
  }

  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return redirectWithError('No encontramos tu organización activa.')
  }

  try {
    const redirectUri = `${origin}/api/meta/callback`

    const shortRes = await fetch(
      `${META_GRAPH_URL}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    )
    const shortData = await shortRes.json()
    if (shortData.error) {
      console.error('[meta/callback] intercambio de código falló:', shortData.error.message)
      return redirectWithError('No pudimos completar la conexión con Meta. Probá de nuevo en unos minutos.')
    }

    const longRes = await fetch(
      `${META_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortData.access_token}`
    )
    const longData = await longRes.json()
    if (longData.error) {
      console.error('[meta/callback] intercambio de token largo falló:', longData.error.message)
      return redirectWithError('No pudimos completar la conexión con Meta. Probá de nuevo en unos minutos.')
    }

    const longLivedToken = longData.access_token
    const expiresInSec = longData.expires_in || 60 * 24 * 60 * 60
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString()

    // Cuentas publicitarias e Instagram se resuelven en paralelo — son
    // independientes (una organización puede tener una sin la otra) y no
    // hay que bloquear una por la otra. fb_user_id es el id de identidad de
    // Facebook, necesario únicamente para el Data Deletion Callback.
    const [accountsResult, instagramResult, fbUserId] = await Promise.all([
      getMetaAdAccounts(longLivedToken),
      getInstagramBusinessAccounts(longLivedToken),
      getFacebookUserId(longLivedToken),
    ])

    if (!accountsResult.ok) {
      console.error('[meta/callback] lectura de cuentas publicitarias falló:', accountsResult.error)
      return redirectWithError('No pudimos leer tus cuentas publicitarias de Meta. Probá de nuevo en unos minutos.')
    }
    const { accounts } = accountsResult
    const igAccounts = instagramResult.ok ? instagramResult.accounts : []

    // Instagram: con una sola Página con IG Business conectado, se guarda
    // directo. Con más de una, se guarda en cookie y se resuelve en
    // /meta-ads/connections/select-instagram — antes este caso se
    // descartaba en silencio, causando el bug real de "me conecté pero
    // Rendimiento sigue pidiendo Instagram" (2026-07-31).
    if (igAccounts.length === 1) {
      const ig = igAccounts[0]
      await saveInstagramConnection(supabase, {
        organizationId: activeOrganizationId,
        pageId: ig.pageId,
        pageName: ig.pageName,
        igUserId: ig.igUserId,
        igUsername: ig.igUsername,
        profilePictureUrl: ig.profilePictureUrl,
        pageAccessToken: ig.pageAccessToken,
        fbUserId,
      })
    } else if (igAccounts.length > 1) {
      pendingCookies.push({
        name: INSTAGRAM_OAUTH_PENDING_COOKIE,
        value: JSON.stringify({ accounts: igAccounts, fbUserId }),
      })
    }

    if (accounts.length === 0) {
      // Sin cuenta publicitaria no es un error si sí se pudo conectar (o
      // queda por elegir) Instagram — recién si las dos cosas fallan no hay
      // nada que ofrecer.
      if (igAccounts.length > 1) return redirect(`${origin}/meta-ads/connections/select-instagram`)
      if (igAccounts.length === 1) return redirect(`${origin}/settings/integrations?meta_connected=1`)
      return redirectWithError('No encontramos ninguna cuenta publicitaria ni de Instagram en tu usuario de Meta.')
    }

    // Con una sola cuenta no hace falta preguntar — se vincula directo. Con
    // varias (portafolios distintos), se guarda todo temporalmente y se pide
    // elegir cuál en /meta-ads/connections/select-account.
    if (accounts.length === 1) {
      const account = accounts[0]
      const saved = await saveMetaConnection(supabase, {
        userId: user.id,
        organizationId: activeOrganizationId,
        token: longLivedToken,
        accountId: account.id,
        accountName: account.name,
        accountCurrency: account.currency,
        appId,
        expiresAt,
        fbUserId,
      })
      if (!saved.ok) {
        console.error('[meta/callback] guardado de la conexión falló:', saved.error)
        return redirectWithError('No pudimos guardar la conexión con Meta. Probá de nuevo en unos minutos.')
      }
      if (igAccounts.length > 1) return redirect(`${origin}/meta-ads/connections/select-instagram`)
      return redirect(`${origin}/settings/integrations?meta_connected=1`)
    }

    pendingCookies.push({
      name: META_OAUTH_PENDING_COOKIE,
      value: JSON.stringify({ token: longLivedToken, expiresAt, accounts, fbUserId }),
    })
    // Si además hay que elegir cuenta de Instagram, esa selección se resuelve
    // después de la de Ads — selectMetaAccountAction chequea el cookie
    // pendiente de Instagram antes de mandar al usuario de vuelta a
    // /meta-ads/connections (ver select-account/actions.ts).
    return redirect(`${origin}/meta-ads/connections/select-account`)
  } catch (err) {
    console.error('[meta/callback] excepción inesperada:', err)
    return redirectWithError('No pudimos completar la conexión con Meta. Probá de nuevo en unos minutos.')
  }
}
