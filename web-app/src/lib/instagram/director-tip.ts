import type { InstagramCatalogRow } from './media-catalog-winners'
import { viewsOf, formatLabel, pluralizeFormat, interactionsTotal } from './media-catalog-winners'

// "Diagnóstico Inteligente" / Tip del Director (Rendimiento, 2026-08-05) —
// mini-diagnóstico masticado para alguien que no sabe leer gráficos: SIEMPRE
// una ventana fija de 7/14 días (no el rango que haya elegido el
// DateRangePicker de la página — esto es siempre "cómo viene esta semana",
// no "cómo viene el rango que estás mirando"), y un solo mensaje a la vez,
// nunca una lista.
//
// Prioridad deliberada: primero se chequea si algo se cayó (Condición B,
// accionable/urgente — el usuario necesita saberlo YA), recién si no hay
// nada preocupante se destaca qué formato está funcionando mejor
// (Condición A, oportunidad/refuerzo positivo). Ambas leen datos reales de
// instagram_media_catalog — nunca se inventa un número si no hay muestra
// suficiente, se devuelve null y el banner no se muestra.

export type DirectorTip = {
  kind: 'decline' | 'format-leader'
  message: string
}

const DECLINE_THRESHOLD_PCT = 20
const FORMAT_THRESHOLD_PCT = 15
const MIN_ITEMS_PER_FORMAT = 2

function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// Condición B: interacciones totales (like+comment+share+save) de los
// últimos 7 días contra los 7 días anteriores — período contra período, no
// contra un promedio histórico, para que un catálogo con mucha antigüedad
// no diluya una caída real y reciente.
function computeEngagementTrend(catalog: InstagramCatalogRow[]): DirectorTip | null {
  const sevenAgo = daysAgoISO(7)
  const fourteenAgo = daysAgoISO(14)

  const current = catalog.filter((r) => r.posted_at && r.posted_at >= sevenAgo)
  const previous = catalog.filter((r) => r.posted_at && r.posted_at >= fourteenAgo && r.posted_at < sevenAgo)
  if (current.length === 0 || previous.length === 0) return null

  const sum = (items: InstagramCatalogRow[]) => items.reduce((total, r) => total + (interactionsTotal(r) ?? 0), 0)
  const currentTotal = sum(current)
  const previousTotal = sum(previous)
  if (previousTotal <= 0) return null

  const changePct = ((currentTotal - previousTotal) / previousTotal) * 100
  if (changePct > -DECLINE_THRESHOLD_PCT) return null

  return {
    kind: 'decline',
    message: `Tus interacciones bajaron un ${Math.abs(Math.round(changePct))}% esta semana. Probá con un llamado a la acción más fuerte en tu próximo post.`,
  }
}

// Condición A: promedio de vistas/alcance por formato en los últimos 14
// días (una semana sola suele tener muy pocas piezas por formato para que
// el promedio diga algo real) — mínimo 2 piezas por formato para entrar en
// la comparación.
function computeFormatLeader(catalog: InstagramCatalogRow[]): DirectorTip | null {
  const since = daysAgoISO(14)
  const recent = catalog.filter((r) => r.posted_at && r.posted_at >= since)

  const byFormat = new Map<string, number[]>()
  for (const row of recent) {
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

  const diffPct = ((best.avg - worst.avg) / worst.avg) * 100
  if (diffPct < FORMAT_THRESHOLD_PCT) return null

  return {
    kind: 'format-leader',
    message: `Tus ${pluralizeFormat(best.format)} están performando un ${Math.round(diffPct)}% mejor que tus ${pluralizeFormat(worst.format)} esta semana — ¡seguí por ahí!`,
  }
}

export function computeDirectorTip(catalog: InstagramCatalogRow[]): DirectorTip | null {
  return computeEngagementTrend(catalog) ?? computeFormatLeader(catalog)
}
