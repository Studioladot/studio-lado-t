import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { META_OAUTH_STATE_COOKIE, META_GRAPH_URL } from '@/lib/meta/oauth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const redirectWithError = (message: string) =>
    NextResponse.redirect(`${origin}/dashboard?meta_error=${encodeURIComponent(message)}`)

  if (oauthError) {
    return redirectWithError('Conexión cancelada.')
  }

  if (!code || !state) {
    return redirectWithError('Falta code o state en la respuesta de Meta.')
  }

  const cookieStore = await cookies()
  const expectedState = cookieStore.get(META_OAUTH_STATE_COOKIE)?.value
  cookieStore.delete(META_OAUTH_STATE_COOKIE)

  if (!expectedState || expectedState !== state) {
    return redirectWithError('El estado de la conexión no es válido — probá de nuevo.')
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
    return NextResponse.redirect(`${origin}/login`)
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
    if (shortData.error) return redirectWithError(shortData.error.message)

    const longRes = await fetch(
      `${META_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortData.access_token}`
    )
    const longData = await longRes.json()
    if (longData.error) return redirectWithError(longData.error.message)

    const longLivedToken = longData.access_token
    const expiresInSec = longData.expires_in || 60 * 24 * 60 * 60
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString()

    const accRes = await fetch(
      `${META_GRAPH_URL}/me/adaccounts?fields=id,name&access_token=${longLivedToken}&limit=200`
    )
    const accData = await accRes.json()
    const accounts: Array<{ id: string; name?: string }> = accData?.data ?? []

    if (accounts.length === 0) {
      return redirectWithError('No encontramos ninguna cuenta publicitaria en tu usuario de Meta.')
    }

    // Si el usuario tiene varias cuentas publicitarias, tomamos la primera —
    // mismo comportamiento que app.html. Falta un selector real para elegir
    // entre varias cuando haga falta (ya era un TODO pendiente en el legado).
    const account = accounts[0]
    const accountId = account.id.replace('act_', '')

    await supabase.from('meta_connections').delete().eq('organization_id', activeOrganizationId)

    const { error: insertError } = await supabase.from('meta_connections').insert({
      user_id: user.id,
      organization_id: activeOrganizationId,
      token: longLivedToken,
      account_id: accountId,
      account_name: account.name ?? null,
      app_id: appId,
      expires_at: expiresAt,
    })

    if (insertError) {
      return redirectWithError('No pudimos guardar la conexión. Probá de nuevo.')
    }

    return NextResponse.redirect(`${origin}/dashboard?meta_connected=1`)
  } catch (err) {
    return redirectWithError(err instanceof Error ? err.message : 'Error desconocido.')
  }
}
