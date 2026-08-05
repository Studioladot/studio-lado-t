'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { clamp, TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'

export type CreateCampaignState = {
  error: string | null
}

export async function createCampaignAction(
  _prevState: CreateCampaignState,
  formData: FormData
): Promise<CreateCampaignState> {
  const nombre = clamp(String(formData.get('nombre') ?? '').trim(), TITLE_MAX_LENGTH)
  const periodo = String(formData.get('periodo') ?? '').trim()
  const objetivo = clamp(String(formData.get('objetivo') ?? '').trim(), TEXT_MAX_LENGTH)
  const fechaInicio = String(formData.get('fecha_inicio') ?? '').trim()
  const fechaFin = String(formData.get('fecha_fin') ?? '').trim()

  if (!nombre) {
    return { error: 'Ingresá un nombre para la campaña.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return { error: 'No encontramos tu organización activa.' }
  }

  const { error } = await supabase.from('content_campaigns').insert({
    nombre,
    periodo: periodo || null,
    objetivo: objetivo || null,
    fecha_inicio: fechaInicio || null,
    fecha_fin: fechaFin || null,
    status: 'planificacion',
    user_id: user.id,
    organization_id: activeOrganizationId,
  })

  if (error) {
    return { error: 'No pudimos crear la campaña. Probá de nuevo.' }
  }

  redirect('/campaigns')
}
