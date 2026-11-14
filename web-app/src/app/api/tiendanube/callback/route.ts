import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { tieneAcceso } from '@/lib/auth/allowlist'
import { TIENDANUBE_OAUTH_STATE_COOKIE, LINK_STATE_PREFIX, verifyTiendaNubeLinkState } from '@/lib/tiendanube/oauth'

// Dos formas de llegar acá:
// 1. "Conectar" desde Integraciones: state aleatorio en cookie, sesión de
//    Gotix en este navegador, se conecta a la cuenta activa.
// 2. Link de conexión (oauth.ts): state firmado con la cuenta de destino.
//    Se abre en otro perfil de Chrome / incógnito o lo abre el dueño de la
//    tienda, sin sesión de Gotix — por eso esta ruta es pública en proxy.ts
//    y en ese caso se guarda con el cliente de servicio, verificando a mano
//    que quien generó el link siga teniendo acceso a esa cuenta.

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const isLink = !!state?.startsWith(LINK_STATE_PREFIX)

  // El link termina en una página pública (no hay sesión para ver Integraciones).
  const done = (params: Record<string, string>) =>
    NextResponse.redirect(
      isLink
        ? `${origin}/tienda-conectada?${new URLSearchParams(params)}`
        : `${origin}/settings/integrations?${new URLSearchParams(params.error ? { tn_error: params.error } : { tn_connected: '1' })}`
    )
  const redirectWithError = (message: string) => done({ error: message })

  if (!code || !state) {
    return redirectWithError('No pudimos completar la conexión con Tienda Nube. Probá de nuevo.')
  }

  const clientId = process.env.TIENDANUBE_CLIENT_ID
  const clientSecret = process.env.TIENDANUBE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return redirectWithError('Tienda Nube no está configurado todavía.')
  }

  let db: SupabaseClient
  let organizationId: string
  let userId: string

  if (isLink) {
    const link = verifyTiendaNubeLinkState(state)
    if (!link) {
      return redirectWithError('Este link de conexión venció o no es válido. Pedí uno nuevo desde Gotix.')
    }
    db = createServiceRoleClient() as unknown as SupabaseClient
    const [{ data: member }, { data: authUser }] = await Promise.all([
      db.from('organization_members').select('user_id').eq('organization_id', link.organizationId).eq('user_id', link.userId).maybeSingle(),
      db.auth.admin.getUserById(link.userId).catch(() => ({ data: { user: null } })),
    ])
    if (!member || !tieneAcceso(authUser?.user?.email)) {
      return redirectWithError('Este link de conexión ya no es válido. Pedí uno nuevo desde Gotix.')
    }
    organizationId = link.organizationId
    userId = link.userId
  } else {
    const cookieStore = await cookies()
    const expectedState = cookieStore.get(TIENDANUBE_OAUTH_STATE_COOKIE)?.value
    cookieStore.delete(TIENDANUBE_OAUTH_STATE_COOKIE)
    if (!expectedState || expectedState !== state) {
      return redirectWithError('No pudimos verificar la conexión con Tienda Nube — probá de nuevo.')
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
    db = supabase as unknown as SupabaseClient
    organizationId = activeOrganizationId
    userId = user.id
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

    // Tienda Nube autoriza la tienda con la que el navegador tiene la sesión
    // abierta. Si esa tienda ya está conectada a OTRA cuenta de Gotix, no se
    // duplica: se renueva el token de esa cuenta (reautorizar puede invalidar
    // el viejo) y se avisa.
    const { data: existing } = await db
      .from('tiendanube_connections')
      .select('organization_id')
      .eq('store_id', storeId)
      .neq('organization_id', organizationId)
      .limit(1)
      .maybeSingle()

    if (existing) {
      await db.from('tiendanube_connections').update({ access_token: accessToken }).eq('store_id', storeId)
      const { data: otherOrg } = await db.from('organizations').select('name').eq('id', existing.organization_id ?? '').maybeSingle()
      const tienda = storeName ?? 'Esa tienda'
      return redirectWithError(
        isLink
          ? `${tienda} ya está conectada a la cuenta ${otherOrg?.name ?? 'otra cuenta'}. Abrí este link en un perfil o ventana donde tengas abierta la tienda correcta.`
          : `${tienda} ya está conectada a la cuenta ${otherOrg?.name ?? 'otra cuenta'}. Usá "Copiar link de conexión" y abrilo en otro perfil de Chrome o ventana de incógnito con la tienda de esta cuenta.`
      )
    }

    await db.from('tiendanube_connections').delete().eq('organization_id', organizationId)

    const { error: insertError } = await db.from('tiendanube_connections').insert({
      user_id: userId,
      organization_id: organizationId,
      store_id: storeId,
      access_token: accessToken,
      store_name: storeName,
      store_url: storeUrl,
    })

    if (insertError) {
      console.error('[tiendanube/callback] guardado de la conexión falló:', insertError.message)
      return redirectWithError('No pudimos guardar la conexión. Probá de nuevo en unos minutos.')
    }

    if (isLink) {
      const { data: org } = await db.from('organizations').select('name').eq('id', organizationId).maybeSingle()
      return done({ tienda: storeName ?? 'Tu tienda', cuenta: org?.name ?? '' })
    }
    return done({})
  } catch (err) {
    console.error('[tiendanube/callback] excepción inesperada:', err)
    return redirectWithError('No pudimos completar la conexión con Tienda Nube. Probá de nuevo en unos minutos.')
  }
}
