'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import type { InstagramBusinessAccount } from '@/lib/instagram/accounts'
import { saveInstagramConnection } from '@/lib/instagram/connections'
import { INSTAGRAM_OAUTH_PENDING_COOKIE } from '@/lib/meta/oauth'

type PendingSelection = { accounts: InstagramBusinessAccount[]; fbUserId: string | null }

export async function selectInstagramAccountAction(formData: FormData) {
  const pageId = String(formData.get('page_id') ?? '')
  const cookieStore = await cookies()
  const raw = cookieStore.get(INSTAGRAM_OAUTH_PENDING_COOKIE)?.value

  if (!raw) {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent('La selección de Instagram expiró — probá conectar de nuevo.'))
  }

  const pending = JSON.parse(raw) as PendingSelection
  const account = pending.accounts.find((a) => a.pageId === pageId)

  if (!account) {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent('Esa cuenta no está en la lista — probá de nuevo.'))
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

  const saved = await saveInstagramConnection(supabase, {
    organizationId: activeOrganizationId,
    pageId: account.pageId,
    pageName: account.pageName,
    igUserId: account.igUserId,
    igUsername: account.igUsername,
    profilePictureUrl: account.profilePictureUrl,
    pageAccessToken: account.pageAccessToken,
    fbUserId: pending.fbUserId,
  })

  cookieStore.delete(INSTAGRAM_OAUTH_PENDING_COOKIE)

  if (!saved) {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent('No pudimos guardar la conexión de Instagram. Probá de nuevo.'))
  }

  redirect('/settings/integrations?meta_connected=1')
}

export async function cancelInstagramAccountSelectionAction() {
  const cookieStore = await cookies()
  cookieStore.delete(INSTAGRAM_OAUTH_PENDING_COOKIE)
  redirect('/settings/integrations')
}
