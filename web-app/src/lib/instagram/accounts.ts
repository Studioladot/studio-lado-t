import { META_GRAPH_URL } from '@/lib/meta/oauth'

// Resolución de Instagram Business/Creator vía la Graph API — no existe
// login de Instagram separado para esto (la Instagram Basic Display API está
// deprecada y no soporta publicación). Un usuario de Facebook administra N
// Páginas; cada Página puede o no tener una cuenta de Instagram Business
// conectada — hay que recorrer /me/accounts y mirar el campo
// instagram_business_account de cada una. El access_token que trae cada
// Página en esta misma respuesta ya es de Página (no de usuario) y hereda
// la duración larga del token de usuario que lo generó siempre que ese
// token de usuario ya haya sido intercambiado a long-lived antes de esta
// llamada (ver callback route: se llama después del exchange).

export type InstagramBusinessAccount = {
  pageId: string
  pageName: string
  pageAccessToken: string
  igUserId: string
  igUsername: string | null
  profilePictureUrl: string | null
}

export type InstagramAccountsResult = { ok: true; accounts: InstagramBusinessAccount[] } | { ok: false; error: string }

type RawPage = {
  id: string
  name?: string
  access_token?: string
  instagram_business_account?: { id: string; username?: string; profile_picture_url?: string }
}

export async function getInstagramBusinessAccounts(userToken: string): Promise<InstagramAccountsResult> {
  const res = await fetch(
    `${META_GRAPH_URL}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url}&limit=200&access_token=${userToken}`
  )
  const data = await res.json()
  if (data.error) return { ok: false, error: data.error.message }

  const pages: RawPage[] = data.data ?? []
  const accounts: InstagramBusinessAccount[] = pages
    .filter((p) => p.instagram_business_account && p.access_token)
    .map((p) => ({
      pageId: p.id,
      pageName: p.name ?? `Página ${p.id}`,
      pageAccessToken: p.access_token!,
      igUserId: p.instagram_business_account!.id,
      igUsername: p.instagram_business_account!.username ?? null,
      profilePictureUrl: p.instagram_business_account!.profile_picture_url ?? null,
    }))

  return { ok: true, accounts }
}
