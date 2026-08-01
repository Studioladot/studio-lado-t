import { META_GRAPH_URL } from './oauth'

export type MetaAdAccount = {
  id: string
  name: string
  businessName: string | null
  status: number
  currency: string | null
}

export type MetaAdAccountsResult = { ok: true; accounts: MetaAdAccount[] } | { ok: false; error: string }

// Códigos reales de account_status en la Marketing API — no hay endpoint que
// devuelva la etiqueta ya traducida.
export const ACCOUNT_STATUS_LABEL: Record<number, string> = {
  1: 'Activa',
  2: 'Deshabilitada',
  3: 'Sin liquidar',
  7: 'En revisión de riesgo',
  8: 'Pendiente de liquidación',
  9: 'En período de gracia',
  100: 'Cerrando',
  101: 'Cerrada',
}

// Id de usuario de Facebook — no confundir con nuestro user_id de Supabase.
// Se guarda en meta_connections/instagram_connections únicamente para poder
// atender el Data Deletion Callback de Meta (identifica al usuario por este
// id, ver src/app/api/meta/data-deletion/route.ts). `null` en vez de tirar
// si falla — no vale la pena romper la conexión completa por esto.
export async function getFacebookUserId(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${META_GRAPH_URL}/me?fields=id&access_token=${token}`)
    const data = await res.json()
    return typeof data?.id === 'string' ? data.id : null
  } catch {
    return null
  }
}

export async function getMetaAdAccounts(token: string): Promise<MetaAdAccountsResult> {
  const res = await fetch(
    `${META_GRAPH_URL}/me/adaccounts?fields=id,name,account_status,currency,business{name}&limit=200&access_token=${token}`
  )
  const data = await res.json()
  if (data.error) return { ok: false, error: data.error.message }

  const accounts: MetaAdAccount[] = (data.data ?? []).map(
    (a: { id: string; name?: string; account_status?: number; currency?: string; business?: { name?: string } }) => ({
      id: String(a.id).replace('act_', ''),
      name: a.name ?? `Cuenta ${a.id}`,
      businessName: a.business?.name ?? null,
      status: a.account_status ?? 1,
      currency: a.currency ?? null,
    })
  )
  return { ok: true, accounts }
}
