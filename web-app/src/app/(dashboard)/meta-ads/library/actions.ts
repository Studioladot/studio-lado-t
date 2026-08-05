'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { clamp, TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'
import {
  getSignedUploadTarget,
  insertLibraryCreative,
  updateLibraryCreative,
  setLibraryCreativeStatus,
  deleteLibraryCreative,
  type CreativeStatus,
  type CreativeType,
} from '@/lib/meta/library'

/**
 * Solo genera la URL firmada — el archivo en sí lo sube el navegador
 * directo a Supabase Storage (creative-form.tsx), nunca pasa por acá. Evita
 * el límite de body de los Server Actions (y el de la plataforma de
 * hosting) que un video de anuncio real supera fácil.
 */
export async function getLibraryUploadUrlAction(
  fileName: string
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const { userId, activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  return getSignedUploadTarget(supabase, userId, fileName)
}

export async function createLibraryCreativeRecordAction(params: {
  fileUrl: string
  assetType: CreativeType
  name: string
  primaryText: string | null
  headline: string | null
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
  })

  if (!result.ok) return result

  revalidatePath('/meta-ads/library')
  return { ok: true }
}

export async function updateLibraryCreativeAction(
  id: string,
  params: { name: string; headline: string | null; primaryText: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = clamp(params.name.trim(), TITLE_MAX_LENGTH)
  if (!name) return { ok: false, error: 'Ponele un nombre al creativo.' }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()
  const ok = await updateLibraryCreative(supabase, activeOrganizationId, id, {
    ...params,
    name,
    headline: params.headline ? clamp(params.headline, TITLE_MAX_LENGTH) : null,
    primaryText: params.primaryText ? clamp(params.primaryText, TEXT_MAX_LENGTH) : null,
  })
  if (!ok) return { ok: false, error: 'No pudimos guardar los cambios. Probá de nuevo.' }

  revalidatePath('/meta-ads/library')
  return { ok: true }
}

export async function setLibraryCreativeStatusAction(id: string, status: CreativeStatus) {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return

  const supabase = await createClient()
  await setLibraryCreativeStatus(supabase, activeOrganizationId, id, status)
  revalidatePath('/meta-ads/library')
}

export async function deleteLibraryCreativeAction(id: string) {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return

  const supabase = await createClient()
  await deleteLibraryCreative(supabase, activeOrganizationId, id)
  revalidatePath('/meta-ads/library')
}
