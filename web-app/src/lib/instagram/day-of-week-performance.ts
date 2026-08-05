import { interactionsTotal, type InstagramCatalogRow } from './media-catalog-winners'

// "Interacciones por Día de la Semana" (2026-08-06) — spider/radar chart
// que cruza el historial de publicaciones (instagram_media_catalog) contra
// el día calendario en que se publicó cada una, para responder "¿qué día
// de la semana funciona mejor para publicar?". Independiente de
// instagram_account_insights (que es por fecha de captura, no por
// publicación) — esto agrupa por posted_at.getDay() de cada publicación
// del catálogo ya filtrado por el rango de fechas elegido arriba.

export type DayOfWeekPoint = {
  day: string
  avgInteractions: number | null
  avgReach: number | null
  postCount: number
}

// getDay() de JS: 0=domingo..6=sábado. DAY_ORDER reordena a Lunes→Domingo
// (pedido explícito), DAY_NAMES queda indexado por el valor crudo de getDay().
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Alcance "honesto" por publicación: reach, o impressions si esa
 * publicación no tiene reach (respaldo para catálogo viejo). Auditoría
 * 2026-08-06: originalmente era al revés (impressions primero) y se
 * llamaba "Impresiones", pero Meta dejó de devolver esa métrica a nivel
 * media (ver media-catalog.ts) — para contenido sincronizado de acá en
 * adelante `impressions` va a ser siempre null, así que reach pasa a ser
 * la fuente primaria y el gráfico se relabelea a "Alcance" para no seguir
 * llamando "Impresiones" a un dato que en la práctica ya es otra cosa.
 */
function reachOf(row: InstagramCatalogRow): number | null {
  return row.reach ?? row.impressions
}

export function computeDayOfWeekPerformance(items: InstagramCatalogRow[]): DayOfWeekPoint[] {
  const buckets = new Map<number, { interactions: number[]; reach: number[]; count: number }>()

  for (const item of items) {
    if (!item.posted_at) continue
    const dayIndex = new Date(item.posted_at).getDay()
    const bucket = buckets.get(dayIndex) ?? { interactions: [], reach: [], count: 0 }
    bucket.count += 1
    const interactions = interactionsTotal(item)
    if (interactions !== null) bucket.interactions.push(interactions)
    const reach = reachOf(item)
    if (reach !== null) bucket.reach.push(reach)
    buckets.set(dayIndex, bucket)
  }

  return DAY_ORDER.map((dayIndex) => {
    const bucket = buckets.get(dayIndex)
    return {
      day: DAY_NAMES[dayIndex],
      avgInteractions: average(bucket?.interactions ?? []),
      avgReach: average(bucket?.reach ?? []),
      postCount: bucket?.count ?? 0,
    }
  })
}

/** Frase de insight automático — el día con más interacciones promedio, o null si no hay suficiente data para decir nada. */
export function bestDayInsight(points: DayOfWeekPoint[]): string | null {
  const withData = points.filter((p): p is DayOfWeekPoint & { avgInteractions: number } => p.avgInteractions !== null)
  if (withData.length === 0) return null

  const best = withData.reduce((a, b) => (b.avgInteractions > a.avgInteractions ? b : a))
  const avgLabel = Math.round(best.avgInteractions).toLocaleString('es-AR')
  return `Mejor día para publicar: ${best.day} — promedio de ${avgLabel} interacciones por publicación`
}
