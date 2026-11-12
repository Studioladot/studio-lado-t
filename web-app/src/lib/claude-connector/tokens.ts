import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { tieneAcceso } from '@/lib/auth/allowlist'

// Clave de la dirección privada de Claude (api/mcp/[token]). Se guarda solo
// el hash SHA-256 — ver migración 20261112120000_claude_access_tokens.sql.

export function generateAccessToken(): string {
  // 32 bytes aleatorios → 43 caracteres base64url, sin padding.
  return crypto.randomBytes(32).toString('base64url')
}

export function hashAccessToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export type ConnectorOrganization = { id: string; name: string; role: string }

export type ConnectorIdentity = {
  userId: string
  email: string | null
  organizations: ConnectorOrganization[]
}

/**
 * Resuelve quién está detrás de una clave: valida que exista, que no esté
 * revocada y que el dueño siga en el allowlist de Gotix, y trae sus
 * organizaciones en ese momento (sacar a alguien de una organización le
 * corta el acceso a esa cuenta en el acto, sin tocar la clave).
 */
export async function resolveAccessToken(token: string): Promise<ConnectorIdentity | null> {
  if (!token || token.length < 30 || token.length > 100) return null

  const supabase = createServiceRoleClient()
  const { data: row } = await supabase
    .from('claude_access_tokens')
    .select('id, user_id, revoked_at')
    .eq('token_hash', hashAccessToken(token))
    .maybeSingle()

  if (!row || row.revoked_at) return null

  const { data: userResult } = await supabase.auth.admin.getUserById(row.user_id)
  const email = userResult?.user?.email ?? null
  if (!tieneAcceso(email)) return null

  // Último uso — informativo (se muestra en Integraciones), va en paralelo.
  const [{ data: memberships }] = await Promise.all([
    supabase.from('organization_members').select('organization_id, role').eq('user_id', row.user_id),
    supabase.from('claude_access_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', row.id),
  ])

  const orgIds = (memberships ?? []).map((m) => m.organization_id)
  const { data: orgs } = orgIds.length > 0 ? await supabase.from('organizations').select('id, name').in('id', orgIds) : { data: [] }
  const roleById = new Map((memberships ?? []).map((m) => [m.organization_id, m.role]))

  return {
    userId: row.user_id,
    email,
    organizations: (orgs ?? [])
      .map((o) => ({ id: o.id, name: o.name, role: roleById.get(o.id) ?? 'member' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
  }
}
