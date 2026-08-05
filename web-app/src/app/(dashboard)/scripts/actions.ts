'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { ANGLES } from './constants'
import { getSignedUploadTarget, insertLibraryCreative, type CreativeType } from '@/lib/meta/library'
import { clamp, TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'

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
      title: clamp(String(formData.get('title') ?? '').trim(), TITLE_MAX_LENGTH) || 'Sin título',
      angle: String(formData.get('angle') ?? '').trim() || null,
      product: clamp(String(formData.get('product') ?? '').trim(), TITLE_MAX_LENGTH) || null,
      status: String(formData.get('status') ?? '').trim() || 'borrador',
      hook: clamp(String(formData.get('hook') ?? '').trim(), TEXT_MAX_LENGTH) || null,
      body: clamp(String(formData.get('body') ?? '').trim(), TEXT_MAX_LENGTH) || null,
      cta: clamp(String(formData.get('cta') ?? '').trim(), TEXT_MAX_LENGTH) || null,
      copy_feed: clamp(String(formData.get('copy_feed') ?? '').trim(), TEXT_MAX_LENGTH) || null,
      notes: clamp(String(formData.get('notes') ?? '').trim(), TEXT_MAX_LENGTH) || null,
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

// ---------------------------------------------------------------------------
// Puente Guiones → Biblioteca de Ads — "Convertir a Anuncio". Mismo flujo
// de subida directa a Storage que ya usa creative-form.tsx (el archivo
// nunca pasa por este servidor), solo que acá el texto ya viene heredado
// del guion en vez de tipearse de cero.
// ---------------------------------------------------------------------------

export async function getScriptConversionUploadUrlAction(
  fileName: string
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  return getSignedUploadTarget(supabase, userId, fileName)
}

export async function convertScriptToCreativeAction(params: {
  scriptId: string
  fileUrl: string
  assetType: CreativeType
  name: string
  headline: string | null
  primaryText: string | null
  cta: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = clamp(params.name.trim(), TITLE_MAX_LENGTH)
  if (!name) return { ok: false, error: 'Ponele un nombre al creativo.' }
  if (!params.fileUrl) return { ok: false, error: 'Subí una imagen o un video.' }

  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const result = await insertLibraryCreative(supabase, {
    organizationId: activeOrganizationId,
    userId,
    fileUrl: params.fileUrl,
    assetType: params.assetType,
    name,
    primaryText: params.primaryText ? clamp(params.primaryText, TEXT_MAX_LENGTH) : null,
    headline: params.headline ? clamp(params.headline, TITLE_MAX_LENGTH) : null,
    cta: params.cta,
    sourceScriptId: params.scriptId,
  })
  if (!result.ok) return result

  // Si todavía era un borrador, dejó de ser una idea suelta — el usuario
  // puede corregirlo a mano si no corresponde.
  const { data: script } = await supabase
    .from('scripts')
    .select('status')
    .eq('id', params.scriptId)
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()
  if (script?.status === 'borrador') {
    await supabase
      .from('scripts')
      .update({ status: 'test' })
      .eq('id', params.scriptId)
      .eq('organization_id', activeOrganizationId)
  }

  revalidatePath(`/scripts/${params.scriptId}`)
  revalidatePath('/meta-ads/library')
  return { ok: true }
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
