import { cookies } from 'next/headers'

export const ACTIVE_ORGANIZATION_COOKIE = 'active_organization_id'

/**
 * Resuelve el id de la organización activa del usuario actual a partir de
 * la cookie, validándolo contra la lista real de organizaciones a las que
 * pertenece (nunca confía en el valor de la cookie a ciegas). Si la cookie
 * no existe, apunta a una organización de la que el usuario ya no es
 * miembro, o el usuario no tiene ninguna organización, hace fallback a la
 * primera de `userOrganizationIds` (o `null` si no tiene ninguna).
 *
 * Toda query nueva a una tabla de negocio (content_posts, finances,
 * meta_connections, etc.) debe filtrar por este id — es la base del
 * filtrado multi-tenant en el frontend:
 *
 *   const orgId = await getActiveOrganizationId(userOrganizationIds)
 *   const { data } = await supabase
 *     .from('content_posts')
 *     .select('*')
 *     .eq('organization_id', orgId)
 */
export async function getActiveOrganizationId(
  userOrganizationIds: string[]
): Promise<string | null> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value

  if (cookieValue && userOrganizationIds.includes(cookieValue)) {
    return cookieValue
  }

  return userOrganizationIds[0] ?? null
}

/**
 * Escribe la cookie de organización activa. El caller es responsable de
 * haber validado que el usuario efectivamente pertenece a `organizationId`
 * antes de llamar esto (ver setActiveOrganizationAction y
 * onboarding/actions.ts) — esta función no vuelve a verificar membresía.
 */
export async function setActiveOrganizationCookie(organizationId: string) {
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}
