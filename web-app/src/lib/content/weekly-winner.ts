import type { InstagramCatalogRow } from '@/lib/instagram/media-catalog-winners'
import { viewsOf, formatLabel, pluralizeFormat } from '@/lib/instagram/media-catalog-winners'

// "Ganador de la Semana" (reestructuración de Contenido, 2026-08-05) — la
// pieza con más reproducciones/alcance de los últimos 7 días, con un texto
// "spoiler" que compara el formato ganador contra el resto de lo publicado
// esa semana. Reusa viewsOf/formatLabel de media-catalog-winners.ts (mismo
// criterio de fallback plays→reach→impressions) en vez de inventar una
// métrica nueva.

export type WeeklyWinner = {
  item: InstagramCatalogRow
  views: number
  format: string
  spoiler: string
}

export function computeWeeklyWinner(catalog: InstagramCatalogRow[]): WeeklyWinner | null {
  const since = new Date()
  since.setDate(since.getDate() - 7)
  const sinceStr = since.toISOString()

  const scored = catalog
    .filter((r) => r.posted_at && r.posted_at >= sinceStr)
    .map((row) => ({ row, views: viewsOf(row) }))
    .filter((x): x is { row: InstagramCatalogRow; views: number } => x.views !== null)

  if (scored.length === 0) return null

  scored.sort((a, b) => b.views - a.views)
  const winner = scored[0]
  const winnerFormat = formatLabel(winner.row)

  const sameFormat = scored.filter((x) => formatLabel(x.row) === winnerFormat)
  const others = scored.filter((x) => formatLabel(x.row) !== winnerFormat)

  let spoiler: string
  if (others.length > 0) {
    const avgWinnerFormat = sameFormat.reduce((sum, x) => sum + x.views, 0) / sameFormat.length
    const avgOthers = others.reduce((sum, x) => sum + x.views, 0) / others.length
    const diffPct = avgOthers > 0 ? Math.round(((avgWinnerFormat - avgOthers) / avgOthers) * 100) : 0

    spoiler =
      diffPct > 5
        ? `Los ${pluralizeFormat(winnerFormat)} generaron un ${diffPct}% más de visualizaciones que el resto esta semana.`
        : `Fue tu publicación con mejor alcance esta semana: ${winner.views.toLocaleString('es-AR')} reproducciones.`
  } else {
    spoiler = `Toda tu actividad de la semana fue en formato ${winnerFormat} — esta pieza fue la que mejor rindió, con ${winner.views.toLocaleString('es-AR')} reproducciones.`
  }

  return { item: winner.row, views: winner.views, format: winnerFormat, spoiler }
}
