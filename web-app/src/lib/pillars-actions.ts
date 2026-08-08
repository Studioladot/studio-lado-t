'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { clamp, TITLE_MAX_LENGTH } from '@/lib/text-limits'
import type { ContentPillar } from './pillars'

// "Pilares Estratégicos" — arquitectura global (2026-08-07). Server Action
// compartida por los 3 selectores (Publicaciones, Campañas de Meta Ads,
// Notas) — vive en `lib/` (no en el actions.ts de ningún módulo) para que
// ninguno de los tres "sea dueño" de la gestión de pilares. Guarda la
// lista COMPLETA de una — más simple y seguro que endpoints separados de
// agregar/renombrar/borrar/reordenar para una lista chica. Texto libre en
// cada consumidor (content_posts.pillar, campaign_pillars.pillar,
// notes.pilar — nunca FK), así que borrar y reinsertar acá nunca rompe
// una asignación existente en ningún módulo.
export type SavePillarsResult = { ok: true; pillars: ContentPillar[] } | { ok: false; error: string }

export async function savePillarsAction(names: string[]): Promise<SavePillarsResult> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const cleaned = names.map((n) => clamp(n.trim(), TITLE_MAX_LENGTH)).filter(Boolean)
  if (cleaned.length === 0) return { ok: false, error: 'Agregá al menos un pilar.' }

  const supabase = await createClient()

  await supabase.from('content_pillars').delete().eq('organization_id', activeOrganizationId)
  const { data: inserted, error } = await supabase
    .from('content_pillars')
    .insert(cleaned.map((name, i) => ({ organization_id: activeOrganizationId, name, sort_order: i })))
    .select('id, name, sort_order')

  if (error || !inserted) return { ok: false, error: 'No pudimos guardar los pilares. Probá de nuevo.' }

  // Revalida las 3 superficies que muestran/editan pilares — el próximo
  // Server Component que se renderice en cualquiera de los 3 módulos ya
  // trae la lista nueva, sin esperar una recarga manual.
  revalidatePath('/content')
  revalidatePath('/meta-ads/campaigns')
  revalidatePath('/notes')

  return {
    ok: true,
    pillars: inserted.map((row) => ({ id: row.id, name: row.name, sortOrder: row.sort_order })).sort((a, b) => a.sortOrder - b.sortOrder),
  }
}
