'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tieneAcceso } from '@/lib/auth/allowlist'
import { generateAccessToken, hashAccessToken } from '@/lib/claude-connector/tokens'

// Alta y revocación de la dirección privada de Claude (api/mcp/[token]).
// Usan el cliente de sesión: las policies de claude_access_tokens limitan
// cada usuario a sus propias filas.

export type ClaudeAccessResult = { ok: true; url: string } | { ok: false; error: string }

async function currentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function createClaudeAccessAction(): Promise<ClaudeAccessResult> {
  const { supabase, user } = await currentUser()
  if (!user || !tieneAcceso(user.email)) return { ok: false, error: 'Tu sesión venció. Volvé a entrar e intentá de nuevo.' }

  // Una sola dirección activa por usuario: generar una nueva revoca la anterior.
  const now = new Date().toISOString()
  const { error: revokeError } = await supabase
    .from('claude_access_tokens')
    .update({ revoked_at: now })
    .eq('user_id', user.id)
    .is('revoked_at', null)
  if (revokeError) {
    console.error('[claude-actions] revocar anterior falló', revokeError)
    return { ok: false, error: 'No se pudo generar la dirección. Probá de nuevo.' }
  }

  const token = generateAccessToken()
  const { error } = await supabase
    .from('claude_access_tokens')
    .insert({ user_id: user.id, token_hash: hashAccessToken(token), token_hint: token.slice(-4) })
  if (error) {
    console.error('[claude-actions] alta falló', error)
    return { ok: false, error: 'No se pudo generar la dirección. Probá de nuevo.' }
  }

  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'www.gotix.com.ar'
  const proto = headerList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')

  revalidatePath('/settings/integrations')
  return { ok: true, url: `${proto}://${host}/api/mcp/${token}` }
}

export async function revokeClaudeAccessAction(): Promise<{ ok: boolean }> {
  const { supabase, user } = await currentUser()
  if (!user) return { ok: false }
  const { error } = await supabase
    .from('claude_access_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('revoked_at', null)
  if (error) console.error('[claude-actions] revocar falló', error)
  revalidatePath('/settings/integrations')
  return { ok: !error }
}
