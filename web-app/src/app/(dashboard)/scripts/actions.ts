'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { ANGLES } from './constants'
import { getSignedUploadTarget, insertLibraryCreative, type CreativeType } from '@/lib/meta/library'
import { clamp, TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'
import { askAI } from '@/lib/ia/client'
import { checkIaUsage, incrementIaUsage } from '@/lib/ia/usage'

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

// ---------------------------------------------------------------------------
// "Generador de Ganchos con DeepSeek" (2026-08-07, Innovación Radical #3) —
// reusa el mismo cliente/cupo de IA que ya paga Contenido
// (generateContentIdeaAction), no una integración nueva. Cada variante se
// guarda como un guion hijo (parent_guion_id → el original), columna que
// ya existía en la tabla `scripts` sin usar — no hace falta migración.
// ---------------------------------------------------------------------------

const HOOK_VARIANTS_SYSTEM_PROMPT = `Sos un guionista experto en hooks (primeros 3 segundos) de Reels/TikTok para e-commerce — el momento que decide si alguien sigue mirando o sigue scrolleando.
Te paso el hook actual de un guion, más su ángulo y producto. Devolvé exactamente 3 variantes NUEVAS de ese hook, cada una con una entrada distinta (ej: pregunta directa, dato o cifra sorprendente, situación relatable), todas pensadas para decirse o mostrarse en 3 segundos o menos.
Respondé SOLO las 3 variantes, una por línea, sin numerarlas ni agregar texto antes o después.`

export type GenerateHookVariantsResult = { ok: true; count: number } | { ok: false; error: string }

export async function generateHookVariantsAction(scriptId: string): Promise<GenerateHookVariantsResult> {
  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()

  const monthlyUsage = await checkIaUsage(supabase, activeOrganizationId)
  if (!monthlyUsage.allowed) {
    return { ok: false, error: `Llegaste al límite de ${monthlyUsage.limit} consultas de IA este mes en tu plan actual.` }
  }

  const { data: script } = await supabase
    .from('scripts')
    .select('title, hook, angle, product')
    .eq('id', scriptId)
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  if (!script) return { ok: false, error: 'No encontramos ese guion.' }
  if (!script.hook?.trim()) return { ok: false, error: 'Escribí un hook primero — hace falta un punto de partida para generar variantes.' }

  const { data: profile } = await supabase
    .from('business_profile')
    .select('brand_name, rubro')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  const contextLine = profile?.brand_name
    ? `La marca es "${profile.brand_name}"${profile.rubro ? ` (rubro: ${profile.rubro})` : ''}. `
    : ''

  const userMessage = `${contextLine}Hook actual: "${script.hook}"${script.angle ? `\nÁngulo: ${script.angle}` : ''}${script.product ? `\nProducto: ${script.product}` : ''}`

  const result = await askAI(HOOK_VARIANTS_SYSTEM_PROMPT, [{ role: 'user', content: userMessage }])
  if (!result.ok) return { ok: false, error: result.error }

  const variants = result.reply
    .split('\n')
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3)

  if (variants.length === 0) return { ok: false, error: 'La IA no devolvió variantes válidas. Probá de nuevo.' }

  await incrementIaUsage(supabase, activeOrganizationId)

  const rows = variants.map((hook, i) => ({
    organization_id: activeOrganizationId,
    user_id: userId,
    parent_guion_id: scriptId,
    title: `Variante ${i + 1} — ${script.title ?? 'Sin título'}`,
    angle: script.angle,
    product: script.product,
    status: 'borrador',
    hook,
  }))

  const { error } = await supabase.from('scripts').insert(rows)
  if (error) return { ok: false, error: 'Generamos las variantes pero no pudimos guardarlas. Probá de nuevo.' }

  revalidatePath(`/scripts/${scriptId}`)
  return { ok: true, count: variants.length }
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
