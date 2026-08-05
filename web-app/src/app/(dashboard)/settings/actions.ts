'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { clamp, TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'

export type BusinessProfileState = {
  error: string | null
  success: boolean
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  const str = String(value ?? '').trim()
  if (!str) return null
  const n = Number(str)
  return Number.isFinite(n) ? n : null
}

export async function saveBusinessProfileAction(
  _prevState: BusinessProfileState,
  formData: FormData
): Promise<BusinessProfileState> {
  const { userId, activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.', success: false }
  }

  const supabase = await createClient()

  const clampTitleField = (value: FormDataEntryValue | null) => {
    const str = String(value ?? '').trim()
    return str ? clamp(str, TITLE_MAX_LENGTH) : null
  }

  const fields = {
    brand_name: clampTitleField(formData.get('brand_name')),
    rubro: clampTitleField(formData.get('rubro')),
    ubicacion: clampTitleField(formData.get('ubicacion')),
    tono: clampTitleField(formData.get('tono')),
    breakeven_roas: numberOrNull(formData.get('breakeven_roas')),
    margen_bruto_objetivo: numberOrNull(formData.get('margen_bruto_objetivo')),
    experto1_nombre: clampTitleField(formData.get('experto1_nombre')),
    experto1_rol: clampTitleField(formData.get('experto1_rol')),
    experto2_nombre: clampTitleField(formData.get('experto2_nombre')),
    experto2_rol: clampTitleField(formData.get('experto2_rol')),
    notas_libres: String(formData.get('notas_libres') ?? '').trim() ? clamp(String(formData.get('notas_libres')).trim(), TEXT_MAX_LENGTH) : null,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('business_profile')
    .select('user_id')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  const { error } = existing
    ? await supabase
        .from('business_profile')
        .update(fields)
        .eq('organization_id', activeOrganizationId)
    : await supabase
        .from('business_profile')
        .insert({ ...fields, organization_id: activeOrganizationId, user_id: userId })

  if (error) {
    return { error: 'No pudimos guardar el perfil. Probá de nuevo.', success: false }
  }

  revalidatePath('/settings')
  return { error: null, success: true }
}
