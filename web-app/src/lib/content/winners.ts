import type { MediaInsight } from '@/app/(dashboard)/content/content-tabs'

// Detección de "ganadores" (Épica Omnicanal, 2026-08-04) — platform-agnóstico
// a propósito: agrupa por (piece_id|post_id, platform) y compara las 2
// últimas capturas de `plays`. Hoy solo hay filas platform='instagram' (todo
// lo que existe); en cuanto la Fase 2 de TikTok empiece a escribir filas
// platform='tiktok' en la misma tabla, esta función las detecta sin tocar
// una línea — reusa `plays` como métrica universal de reproducciones (mismo
// concepto que TikTok llama "views").

export type WinningItem = {
  key: string
  sourceTable: 'content_piezas' | 'content_posts'
  itemId: string
  title: string
  permalink: string | null
  platform: string
  latestPlays: number
  previousPlays: number
  growthPct: number
  growthAbs: number
}

const GROWTH_PCT_THRESHOLD = 50
const GROWTH_ABS_THRESHOLD = 1000
/** Techo de exhibición cuando previousPlays=0 (crecimiento matemáticamente infinito) — no se manda Infinity a un toFixed(). */
const UNBOUNDED_GROWTH_DISPLAY_PCT = 999

export function detectWinningItems(mediaInsights: MediaInsight[]): WinningItem[] {
  const groups = new Map<string, MediaInsight[]>()
  for (const row of mediaInsights) {
    const itemId = row.piece_id ?? row.post_id
    if (!itemId) continue
    const key = `${itemId}:${row.platform}`
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }

  const winners: WinningItem[] = []

  for (const [key, rows] of groups) {
    if (rows.length < 2) continue

    const sorted = [...rows].sort((a, b) => a.captured_at.localeCompare(b.captured_at))
    const latest = sorted[sorted.length - 1]
    const previous = sorted[sorted.length - 2]
    const latestPlays = latest.plays ?? 0
    const previousPlays = previous.plays ?? 0
    const growthAbs = latestPlays - previousPlays
    const growthPct = previousPlays > 0 ? (growthAbs / previousPlays) * 100 : latestPlays > 0 ? UNBOUNDED_GROWTH_DISPLAY_PCT : 0

    if (growthAbs < GROWTH_ABS_THRESHOLD && growthPct < GROWTH_PCT_THRESHOLD) continue

    const sourceTable: WinningItem['sourceTable'] = latest.piece_id ? 'content_piezas' : 'content_posts'
    const title = latest.content_piezas?.titulo ?? latest.content_posts?.title ?? 'Sin título'
    const permalink = latest.content_piezas?.ig_permalink ?? latest.content_posts?.ig_permalink ?? null

    winners.push({
      key,
      sourceTable,
      itemId: (latest.piece_id ?? latest.post_id)!,
      title,
      permalink,
      platform: latest.platform,
      latestPlays,
      previousPlays,
      growthPct,
      growthAbs,
    })
  }

  return winners.sort((a, b) => b.growthPct - a.growthPct)
}
