'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getMetaAdAccounts, type MetaAdAccount } from '@/lib/meta/accounts'
import { saveMetaConnection } from '@/lib/meta/connections'
import { META_OAUTH_PENDING_COOKIE, INSTAGRAM_OAUTH_PENDING_COOKIE } from '@/lib/meta/oauth'

type PendingSelection = { token: string; expiresAt: string; accounts: MetaAdAccount[]; fbUserId?: string | null }

export async function selectMetaAccountAction(formData: FormData) {
  const accountId = String(formData.get('account_id') ?? '')
  const cookieStore = await cookies()
  const raw = cookieStore.get(META_OAUTH_PENDING_COOKIE)?.value

  if (!raw) {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent('La selección expiró — probá conectar de nuevo.'))
  }

  const pending = JSON.parse(raw) as PendingSelection
  const account = pending.accounts.find((a) => a.id === accountId)

  if (!account) {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent('Esa cuenta no está en la lista — probá de nuevo.'))
  }

  const appId = process.env.META_APP_ID
  if (!appId) {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent('Meta Ads no está configurado todavía.'))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent('No encontramos tu organización activa.'))
  }

  const saved = await saveMetaConnection(supabase, {
    userId: user.id,
    organizationId: activeOrganizationId,
    token: pending.token,
    accountId: account.id,
    accountName: account.name,
    accountCurrency: account.currency,
    appId,
    expiresAt: pending.expiresAt,
    fbUserId: pending.fbUserId ?? null,
  })

  cookieStore.delete(META_OAUTH_PENDING_COOKIE)

  if (!saved.ok) {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent(`No pudimos guardar la conexión: ${saved.error}`))
  }

  // Si el usuario también tiene más de una cuenta de Instagram elegible,
  // esa selección quedó pendiente en su propio cookie (ver
  // src/app/api/meta/callback/route.ts) — se resuelve inmediatamente
  // después de esta, no se pierde.
  if (cookieStore.get(INSTAGRAM_OAUTH_PENDING_COOKIE)?.value) {
    redirect('/meta-ads/connections/select-instagram')
  }

  redirect('/settings/integrations?meta_connected=1')
}

export async function cancelMetaAccountSelectionAction() {
  const cookieStore = await cookies()
  cookieStore.delete(META_OAUTH_PENDING_COOKIE)
  cookieStore.delete(INSTAGRAM_OAUTH_PENDING_COOKIE)
  redirect('/settings/integrations')
}

// Reutiliza el token ya guardado (sin pasar por el consentimiento de Meta de
// nuevo) para dejar elegir otra cuenta publicitaria del mismo usuario.
export async function changeMetaAccountAction() {
  const supabase = await createClient()
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) redirect('/settings/integrations')

  const { data: connection } = await supabase
    .from('meta_connections')
    .select('token, expires_at, fb_user_id')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  if (!connection || !connection.expires_at || new Date(connection.expires_at) < new Date()) {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent('Tu conexión venció — reconectá para cambiar de cuenta.'))
  }

  const accountsResult = await getMetaAdAccounts(connection.token)
  if (!accountsResult.ok) {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent(accountsResult.error))
  }

  const { accounts } = accountsResult
  if (accounts.length <= 1) {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent('Solo encontramos una cuenta publicitaria en tu usuario de Meta.'))
  }

  const cookieStore = await cookies()
  cookieStore.set(
    META_OAUTH_PENDING_COOKIE,
    JSON.stringify({ token: connection.token, expiresAt: connection.expires_at, accounts, fbUserId: connection.fb_user_id }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10,
    }
  )
  redirect('/meta-ads/connections/select-account')
}
