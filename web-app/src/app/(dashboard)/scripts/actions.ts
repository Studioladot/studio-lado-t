'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { ANGLES } from './constants'

export async function createScriptAction() {
  const { userId, activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    redirect('/scripts')
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scripts')
    .insert({
      organization_id: activeOrganizationId,
      user_id: userId,
      title: 'Nuevo guion',
      angle: ANGLES[0],
      status: 'borrador',
    })
    .select('id')
    .single()

  if (error || !data) {
    redirect('/scripts')
  }

  redirect(`/scripts/${data.id}`)
}

export type UpdateScriptState = { error: string | null; success: boolean }

export async function updateScriptAction(
  scriptId: string,
  _prevState: UpdateScriptState,
  formData: FormData
): Promise<UpdateScriptState> {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.', success: false }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('scripts')
    .update({
      title: String(formData.get('title') ?? '').trim() || 'Sin título',
      angle: String(formData.get('angle') ?? '').trim() || null,
      product: String(formData.get('product') ?? '').trim() || null,
      status: String(formData.get('status') ?? '').trim() || 'borrador',
      hook: String(formData.get('hook') ?? '').trim() || null,
      body: String(formData.get('body') ?? '').trim() || null,
      cta: String(formData.get('cta') ?? '').trim() || null,
      copy_feed: String(formData.get('copy_feed') ?? '').trim() || null,
      notes: String(formData.get('notes') ?? '').trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scriptId)
    .eq('organization_id', activeOrganizationId)

  if (error) {
    return { error: 'No pudimos guardar el guion. Probá de nuevo.', success: false }
  }

  revalidatePath(`/scripts/${scriptId}`)
  revalidatePath('/scripts')
  return { error: null, success: true }
}

export async function deleteScriptAction(scriptId: string) {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return
  }

  const supabase = await createClient()

  await supabase.from('scripts').delete().eq('id', scriptId).eq('organization_id', activeOrganizationId)

  revalidatePath('/scripts')
  redirect('/scripts')
}
