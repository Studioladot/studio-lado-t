import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { TIENDANUBE_OAUTH_STATE_COOKIE } from '@/lib/tiendanube/oauth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const redirectWithError = (message: string) =>
    NextResponse.redirect(`${origin}/settings/integrations?tn_error=${encodeURIComponent(message)}`)

  if (!code || !state) {
    return redirectWithError('Falta code o state en la respuesta de Tienda Nube.')
  }

  const cookieStore = await cookies()
  const expectedState = cookieStore.get(TIENDANUBE_OAUTH_STATE_COOKIE)?.value
  cookieStore.delete(TIENDANUBE_OAUTH_STATE_COOKIE)

  if (!expectedState || expectedState !== state) {
    return redirectWithError('El estado de la conexión no es válido — probá de nuevo.')
  }

  const clientId = process.env.TIENDANUBE_CLIENT_ID
  const clientSecret = process.env.TIENDANUBE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return redirectWithError('Tienda Nube no está configurado todavía.')
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
    const tokenRes = await fetch('https://www.tiendanube.com/apps/authorize/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      return redirectWithError('No pudimos conectar con Tienda Nube.')
    }

    // Tienda Nube llama "user_id" al ID de la tienda — no confundir con el
    // user_id de Supabase/Gotix.
    const accessToken: string = tokenData.access_token
    const storeId: string = String(tokenData.user_id)

    let storeName: string | null = null
    let storeUrl: string | null = null

    try {
      const storeRes = await fetch(`https://api.tiendanube.com/v1/${storeId}/store`, {
        headers: {
          Authentication: `bearer ${accessToken}`,
          'User-Agent': 'GOTIX (contacto@gotix.app)',
        },
      })
      const storeData = await storeRes.json()
      storeName = storeData?.name?.es ?? storeData?.name ?? null
      storeUrl = storeData?.url ?? null
    } catch {
      // No es crítico — igual guardamos la conexión sin el nombre de tienda.
    }

    await supabase.from('tiendanube_connections').delete().eq('organization_id', activeOrganizationId)

    const { error: insertError } = await supabase.from('tiendanube_connections').insert({
      user_id: user.id,
      organization_id: activeOrganizationId,
      store_id: storeId,
      access_token: accessToken,
      store_name: storeName,
      store_url: storeUrl,
    })

    if (insertError) {
      return redirectWithError('No pudimos guardar la conexión. Probá de nuevo.')
    }

    return NextResponse.redirect(`${origin}/settings/integrations?tn_connected=1`)
  } catch (err) {
    return redirectWithError(err instanceof Error ? err.message : 'Error desconocido.')
  }
}
