import type { Database } from '@/lib/types/database.types'

export type InstagramCatalogRow = Database['public']['Tables']['instagram_media_catalog']['Row']

// Mismo criterio que src/lib/tiktok/winners.ts: no hay serie histórica acá
// (cada sync trae el total vigente, no un delta diario), así que "Viral"
// se calcula contra el promedio de la cuenta, no contra un crecimiento en
// el tiempo (eso lo sigue haciendo detectWinningItems para lo que Gotix
// publicó). La métrica primaria es plays si es un Reel/video, o
// impressions/reach para fotos/carruseles — se usa el mejor dato
// disponible por ítem, mismo fallback que ya usaba topByPlays en
// performance-tab.tsx.
const WINNER_MULTIPLIER = 1.5

export function primaryMetric(row: InstagramCatalogRow): number {
  return row.plays ?? row.impressions ?? row.reach ?? 0
}

export function detectInstagramCatalogWinners(rows: InstagramCatalogRow[]): Set<string> {
  if (rows.length < 2) return new Set()

  const avg = rows.reduce((sum, r) => sum + primaryMetric(r), 0) / rows.length
  if (avg <= 0) return new Set()

  const winners = new Set<string>()
  for (const r of rows) {
    if (primaryMetric(r) >= avg * WINNER_MULTIPLIER) winners.add(r.id)
  }
  return winners
}

// Badge de formato (bug real reportado, 2026-08-01): media_type
// (IMAGE/VIDEO/CAROUSEL_ALBUM) solo no alcanza para distinguir un Reel de
// un video de feed normal — los dos vienen con media_type=VIDEO, la
// diferencia está en media_product_type (REELS/FEED/...), un campo
// separado de la Graph API que antes no se pedía ni se guardaba.
export function formatLabel(row: InstagramCatalogRow): string {
  if (row.media_product_type === 'REELS') return 'Reel'
  if (row.media_type === 'CAROUSEL_ALBUM') return 'Carrusel'
  if (row.media_type === 'VIDEO') return 'Video'
  if (row.media_type === 'IMAGE') return 'Imagen'
  return 'Publicación'
}
