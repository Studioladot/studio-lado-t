import type { InstagramCatalogRow } from './media-catalog-winners'
import { viewsOf, formatLabel, pluralizeFormat } from './media-catalog-winners'

// "Insight Inteligente" de Rendimiento (reestructuración de Contenido,
// 2026-08-05) — compara el promedio de reproducciones/alcance por formato
// dentro del rango de fechas ya filtrado en PerformanceTab y devuelve un
// consejo condicional en texto plano. Mínimo 2 ítems por formato para
// entrar en la comparación — con 1 solo dato el "promedio" no dice nada
// real, mejor no mostrar el insight que mostrar uno engañoso.
const MIN_ITEMS_PER_FORMAT = 2

export type FormatInsight = {
  bestFormat: string
  worstFormat: string
  diffPct: number
  message: string
}

export function computeFormatInsight(items: InstagramCatalogRow[]): FormatInsight | null {
  const byFormat = new Map<string, number[]>()
  for (const row of items) {
    const views = viewsOf(row)
    if (views === null) continue
    const format = formatLabel(row)
    const list = byFormat.get(format) ?? []
    list.push(views)
    byFormat.set(format, list)
  }

  const averages = [...byFormat.entries()]
    .filter(([, views]) => views.length >= MIN_ITEMS_PER_FORMAT)
    .map(([format, views]) => ({ format, avg: views.reduce((a, b) => a + b, 0) / views.length }))
    .sort((a, b) => b.avg - a.avg)

  if (averages.length < 2) return null

  const best = averages[0]
  const worst = averages[averages.length - 1]
  if (worst.avg <= 0) return null

  const diffPct = Math.round(((best.avg - worst.avg) / worst.avg) * 100)
  if (diffPct < 10) return null

  return {
    bestFormat: best.format,
    worstFormat: worst.format,
    diffPct,
    message: `Tus ${pluralizeFormat(best.format)} están rindiendo un ${diffPct}% mejor que tus ${pluralizeFormat(worst.format)} en este período. Enfocate en este formato.`,
  }
}
