// Insights Automáticos — reglas determinísticas, cero IA (mismo criterio que
// renderTNInsights del legado, app.html:12484-12496, comentario explícito
// "basados en reglas"), coherente con el blindaje de costos de tokens de la
// ronda anterior (ver lib/ia/*): esto no debe costar ni un token.

export type Insight = { tone: 'ok' | 'warn' | 'alert'; message: string }

const ROAS_OVERESTIMATION_THRESHOLD = 0.25
const CPA_CHANGE_THRESHOLD = 0.1

function pct(value: number): number {
  return Math.round(Math.abs(value) * 100)
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

const LOW_CONVERSION_THRESHOLD_PCT = 30
const MIN_CARTS_FOR_CONVERSION_INSIGHT = 5

export function generateInsights(params: {
  roasMeta: number
  roasReal: number
  cpaCurrent: number
  cpaPrevious: number | null
  aovCurrent: number
  aovPrevious: number | null
  tiedUpCapital: number
  checkoutFunnel?: { carritosCreados: number; ventasCerradas: number; tasaConversion: number } | null
}): Insight[] {
  const { roasMeta, roasReal, cpaCurrent, cpaPrevious, aovCurrent, aovPrevious, tiedUpCapital, checkoutFunnel } = params
  const insights: Insight[] = []

  // Meta suele sobreestimar el ROAS por atribución de píxel — mismo umbral
  // conceptual que el legado (alerta cuando el ROAS reportado por Meta se
  // despega mucho del ROAS real cruzado contra Tienda Nube).
  if (roasMeta > 0 && roasReal > 0) {
    const overestimation = (roasMeta - roasReal) / roasReal
    if (overestimation > ROAS_OVERESTIMATION_THRESHOLD) {
      insights.push({
        tone: 'alert',
        message: `El ROAS que reporta Meta (${roasMeta.toFixed(2)}x) está ${pct(overestimation)}% por encima del ROAS real (${roasReal.toFixed(2)}x) — revisá la atribución del píxel antes de escalar presupuesto en base a ese número.`,
      })
    }
  }

  if (cpaPrevious !== null && cpaPrevious > 0 && cpaCurrent > 0) {
    const cpaChange = (cpaCurrent - cpaPrevious) / cpaPrevious
    if (Math.abs(cpaChange) > CPA_CHANGE_THRESHOLD) {
      if (cpaChange > 0) {
        const aovChange = aovPrevious && aovPrevious > 0 ? (aovCurrent - aovPrevious) / aovPrevious : 0
        // "Absorbido" = el Ticket Promedio subió al menos la mitad de lo que subió el CPA —
        // no cubre el 100% exacto, es una heurística de alivio parcial vs. sin alivio.
        const absorbed = aovChange >= cpaChange * 0.5
        insights.push({
          tone: absorbed ? 'ok' : 'warn',
          message: absorbed
            ? `Tu CPA subió un ${pct(cpaChange)}% respecto al período anterior, pero tu Ticket Promedio lo absorbió — margen a salvo.`
            : `Tu CPA subió un ${pct(cpaChange)}% respecto al período anterior y el Ticket Promedio no compensó la suba — revisá el margen.`,
        })
      } else {
        insights.push({
          tone: 'ok',
          message: `Tu CPA bajó un ${pct(cpaChange)}% respecto al período anterior.`,
        })
      }
    }
  }

  // Capital inmovilizado real (stock trackeado por Tienda Nube, sin ventas
  // en el período) — solo se cuenta lo que tiene costo cargado, ver
  // rankProducts (orders.ts).
  if (tiedUpCapital > 0) {
    insights.push({
      tone: 'warn',
      message: `Tenés ${money(tiedUpCapital)} inmovilizados en productos sin rotación este período — mirá la lista de Productos Muertos.`,
    })
  }

  // Tasa de conversión del checkout real de Tienda Nube (GET /checkouts) —
  // umbral mínimo de carritos para no disparar la alerta con una muestra de
  // 1 o 2 carritos, donde el % no significa nada.
  if (checkoutFunnel && checkoutFunnel.carritosCreados >= MIN_CARTS_FOR_CONVERSION_INSIGHT) {
    if (checkoutFunnel.tasaConversion < LOW_CONVERSION_THRESHOLD_PCT) {
      insights.push({
        tone: 'warn',
        message: `Solo el ${Math.round(checkoutFunnel.tasaConversion)}% de los carritos creados se convirtió en venta este período (${checkoutFunnel.ventasCerradas} de ${checkoutFunnel.carritosCreados}) — mirá la lista de Carritos Abandonados para recuperar algunos con un cupón.`,
      })
    }
  }

  if (insights.length === 0) {
    insights.push({ tone: 'ok', message: 'Sin variaciones relevantes en el período — tus métricas se mantienen estables.' })
  }

  return insights
}
