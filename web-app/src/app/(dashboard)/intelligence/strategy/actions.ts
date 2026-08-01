'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { buildSystemPrompt } from '@/lib/ia/context'
import { askAI, type ChatMessage } from '@/lib/ia/client'
import { checkIaUsage, incrementIaUsage } from '@/lib/ia/usage'

export async function sendStrategyMessageAction(message: string): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const trimmed = message.trim()
  if (!trimmed) return { ok: false, error: 'Escribí un mensaje.' }

  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()

  // Se chequea ANTES de tocar Meta o la IA — un plan que agotó su cupo no
  // debe gastar ni una consulta más, ni de API de Meta ni de tokens.
  const usage = await checkIaUsage(supabase, activeOrganizationId)
  if (!usage.allowed) {
    return {
      ok: false,
      error: `Llegaste al límite de ${usage.limit} consultas de IA este mes en tu plan actual. Subí a Plan Pro para consultas ilimitadas.`,
    }
  }

  const { data: connection } = await supabase
    .from('meta_connections')
    .select('token, account_id')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  const { data: history } = await supabase
    .from('ia_chat_messages')
    .select('role, content')
    .eq('organization_id', activeOrganizationId)
    .order('created_at', { ascending: true })
    .limit(20)

  const systemPrompt = await buildSystemPrompt(
    supabase,
    activeOrganizationId,
    connection ? { token: connection.token, accountId: connection.account_id } : null
  )

  const messages: ChatMessage[] = [
    ...(history ?? []).map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: trimmed },
  ]

  await supabase.from('ia_chat_messages').insert({ organization_id: activeOrganizationId, role: 'user', content: trimmed, created_by: userId })

  const result = await askAI(systemPrompt, messages)
  if (!result.ok) return result

  await incrementIaUsage(supabase, activeOrganizationId)

  await supabase
    .from('ia_chat_messages')
    .insert({ organization_id: activeOrganizationId, role: 'assistant', content: result.reply, created_by: userId })

  revalidatePath('/intelligence/strategy')
  return { ok: true, reply: result.reply }
}

export async function clearStrategyChatAction(): Promise<void> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return

  const supabase = await createClient()
  await supabase.from('ia_chat_messages').delete().eq('organization_id', activeOrganizationId)
  revalidatePath('/intelligence/strategy')
}
