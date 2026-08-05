import { interactionsTotal, type TiktokVideoRow } from './winners'

// Puerto directo de src/lib/instagram/day-of-week-performance.ts (Paridad
// de Plataformas, 2026-08-06) — mismo cruce (interacciones/vistas
// promedio por día de la semana de publicación), pero con "Vistas" en vez
// de "Impresiones": TikTok no tiene un concepto separado de impresiones,
// view_count es lo único (y siempre un número real, nunca null).

export type DayOfWeekPoint = {
  day: string
  avgInteractions: number | null
  avgViews: number | null
  postCount: number
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function computeDayOfWeekPerformance(videos: TiktokVideoRow[]): DayOfWeekPoint[] {
  const buckets = new Map<number, { interactions: number[]; views: number[]; count: number }>()

  for (const video of videos) {
    if (!video.posted_at) continue
    const dayIndex = new Date(video.posted_at).getDay()
    const bucket = buckets.get(dayIndex) ?? { interactions: [], views: [], count: 0 }
    bucket.count += 1
    bucket.interactions.push(interactionsTotal(video))
    bucket.views.push(video.view_count)
    buckets.set(dayIndex, bucket)
  }

  return DAY_ORDER.map((dayIndex) => {
    const bucket = buckets.get(dayIndex)
    return {
      day: DAY_NAMES[dayIndex],
      avgInteractions: average(bucket?.interactions ?? []),
      avgViews: average(bucket?.views ?? []),
      postCount: bucket?.count ?? 0,
    }
  })
}

export function bestDayInsight(points: DayOfWeekPoint[]): string | null {
  const withData = points.filter((p): p is DayOfWeekPoint & { avgInteractions: number } => p.avgInteractions !== null)
  if (withData.length === 0) return null

  const best = withData.reduce((a, b) => (b.avgInteractions > a.avgInteractions ? b : a))
  const avgLabel = Math.round(best.avgInteractions).toLocaleString('es-AR')
  return `Mejor día para publicar: ${best.day} — promedio de ${avgLabel} interacciones por video`
}
