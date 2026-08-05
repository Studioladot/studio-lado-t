import type { Database } from '@/lib/types/database.types'

export type TiktokVideoRow = Database['public']['Tables']['tiktok_videos']['Row']

// A diferencia de detectWinningItems (winners.ts de Contenido, que compara
// 2 snapshots en el tiempo — crecimiento), acá no hay serie histórica: la
// Display API de TikTok da totales vigentes, no deltas diarios. El pedido
// original fue explícito en esto: "rendimiento superior al promedio", no
// "que creció" — un video se marca ganador si sus vistas superan el
// promedio de la cuenta por este múltiplo.
const WINNER_MULTIPLIER = 1.5

/** Devuelve el set de ids (tiktok_videos.id) que califican como "Viral". */
export function detectTiktokWinners(videos: TiktokVideoRow[]): Set<string> {
  if (videos.length < 2) return new Set()

  const avgViews = videos.reduce((sum, v) => sum + v.view_count, 0) / videos.length
  if (avgViews <= 0) return new Set()

  const winners = new Set<string>()
  for (const v of videos) {
    if (v.view_count >= avgViews * WINNER_MULTIPLIER) winners.add(v.id)
  }
  return winners
}

// A diferencia del catálogo de Instagram, la Display API de TikTok siempre
// devuelve estos 3 contadores como número (nunca null/undefined en el
// esquema — ver database.types.ts) — no hace falta una versión "honesta
// con null" de esto, la suma directa ya es real (Paridad de Plataformas,
// 2026-08-06).
export function interactionsTotal(video: TiktokVideoRow): number {
  return video.like_count + video.comment_count + video.share_count
}

/** "0:32" a partir de segundos — badge de duración en la grilla (duration_seconds era una métrica huérfana: se sincroniza pero nunca se mostraba). */
export function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds < 0) return null
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
