'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'

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

  const fields = {
    brand_name: String(formData.get('brand_name') ?? '').trim() || null,
    rubro: String(formData.get('rubro') ?? '').trim() || null,
    ubicacion: String(formData.get('ubicacion') ?? '').trim() || null,
    tono: String(formData.get('tono') ?? '').trim() || null,
    breakeven_roas: numberOrNull(formData.get('breakeven_roas')),
    margen_bruto_objetivo: numberOrNull(formData.get('margen_bruto_objetivo')),
    experto1_nombre: String(formData.get('experto1_nombre') ?? '').trim() || null,
    experto1_rol: String(formData.get('experto1_rol') ?? '').trim() || null,
    experto2_nombre: String(formData.get('experto2_nombre') ?? '').trim() || null,
    experto2_rol: String(formData.get('experto2_rol') ?? '').trim() || null,
    notas_libres: String(formData.get('notas_libres') ?? '').trim() || null,
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
