import type { SupabaseClient } from '@supabase/supabase-js'

export type ContentPillar = { id: string; name: string; sortOrder: number }

// "Pilares Estratégicos" — arquitectura global (2026-08-07): Atracción/
// Nutrición/Venta son el default de arranque, no una lista fija. Este
// archivo vive en `lib/` (no en `content/`) a propósito — la lista de
// pilares es transversal a Publicaciones, Campañas de Meta Ads y Notas por
// igual, ninguna de las tres es "dueña" de ella. `content_pillars` sigue
// siendo el nombre de la tabla (nació ahí primero) pero ya es la fuente
// única de verdad para toda la plataforma.
const DEFAULT_PILLAR_NAMES = ['Atracción', 'Nutrición', 'Venta']

/**
 * Lista de pilares de la organización, ordenada. Si todavía no tiene
 * ninguno (cuenta nueva o existente que nunca abrió el selector), siembra
 * los 3 default una sola vez — sin depender de un trigger sobre la
 * creación de `organizations` (no vive en este repo), cubre tanto cuentas
 * nuevas como las que ya existían antes de esta feature.
 */
export async function getContentPillars(supabase: SupabaseClient, organizationId: string): Promise<ContentPillar[]> {
  const { data } = await supabase
    .from('content_pillars')
    .select('id, name, sort_order')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })

  if (data && data.length > 0) {
    return data.map((row) => ({ id: row.id, name: row.name, sortOrder: row.sort_order }))
  }

  const { data: seeded } = await supabase
    .from('content_pillars')
    .insert(DEFAULT_PILLAR_NAMES.map((name, i) => ({ organization_id: organizationId, name, sort_order: i })))
    .select('id, name, sort_order')

  return (seeded ?? [])
    .map((row) => ({ id: row.id, name: row.name, sortOrder: row.sort_order }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}
