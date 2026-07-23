'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'

export type InviteState = {
  error: string | null
  success: boolean
}

type InviteResult = { ok: boolean; error?: 'no_account' | 'already_member' }

export async function inviteMemberAction(
  _prevState: InviteState,
  formData: FormData
): Promise<InviteState> {
  const email = String(formData.get('email') ?? '').trim()

  if (!email) {
    return { error: 'Ingresá un email.', success: false }
  }

  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.', success: false }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('invite_member_by_email', {
    org_id: activeOrganizationId,
    member_email: email,
  })

  if (error) {
    const message = error.message.includes('only owners')
      ? 'Solo el dueño de la organización puede invitar miembros.'
      : 'No pudimos invitar a ese usuario. Probá de nuevo.'
    return { error: message, success: false }
  }

  const result = data as InviteResult

  if (!result.ok) {
    if (result.error === 'no_account') {
      return { error: 'Ese email todavía no tiene una cuenta en Gotix.', success: false }
    }
    if (result.error === 'already_member') {
      return { error: 'Ya es parte de esta organización.', success: false }
    }
    return { error: 'No pudimos invitar a ese usuario. Probá de nuevo.', success: false }
  }

  revalidatePath('/team')
  return { error: null, success: true }
}

export async function removeMemberAction(targetUserId: string) {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return
  }

  const supabase = await createClient()
  await supabase.rpc('remove_member', {
    org_id: activeOrganizationId,
    target_user_id: targetUserId,
  })

  revalidatePath('/team')
}
