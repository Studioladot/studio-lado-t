import type { SupabaseClient } from '@supabase/supabase-js'

export type SaveMetaConnectionResult = { ok: true } | { ok: false; error: string }

/**
 * Fix (bloque de corrección, 2026-08-03): antes devolvía solo `!error`
 * (boolean) — un rechazo de RLS y cualquier otro error de Postgres se veían
 * idénticos desde afuera, siempre el mismo "No pudimos guardar la
 * conexión." genérico, sin ninguna pista de la causa real. Ahora propaga el
 * mensaje real de Postgres hasta el redirect `meta_error` (ver
 * api/meta/callback/route.ts y select-account/actions.ts) — mismo criterio
 * de "no tragar errores en silencio" ya aplicado en operations/sales.
 */
export async function saveMetaConnection(
  supabase: SupabaseClient,
  params: {
    userId: string
    organizationId: string
    token: string
    accountId: string
    accountName: string | null
    accountCurrency: string | null
    appId: string
    expiresAt: string
    /** Id de usuario de Facebook (GET /me) — necesario para poder atender el Data Deletion Callback de Meta, que identifica al usuario por este id, no por el nuestro. */
    fbUserId: string | null
  }
): Promise<SaveMetaConnectionResult> {
  await supabase.from('meta_connections').delete().eq('organization_id', params.organizationId)

  const { error } = await supabase.from('meta_connections').insert({
    user_id: params.userId,
    organization_id: params.organizationId,
    token: params.token,
    account_id: params.accountId,
    account_name: params.accountName,
    account_currency: params.accountCurrency,
    app_id: params.appId,
    expires_at: params.expiresAt,
    fb_user_id: params.fbUserId,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
