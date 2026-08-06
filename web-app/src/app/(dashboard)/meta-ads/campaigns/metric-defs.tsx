import type { ReactNode } from 'react'
import type { MetaMetrics } from '@/lib/meta/campaigns'
import { ctrColor, cpmColor, cpcColor, frequencyColor, hookRateColor } from './status'
import { cpaColorByTargets, roasColorByTargets, type CampaignTargets } from '@/lib/meta/autopilot'
import { convertAmount, formatMoney, type Currency } from '@/lib/currency'

export type MetricColumnId =
  | 'spend'
  | 'roas'
  | 'purchases'
  | 'cpa'
  | 'ctr'
  | 'cpm'
  | 'impressions'
  | 'hookRate'
  | 'linkClicks'
  | 'cpc'
  | 'frequency'
  | 'initiateCheckout'
  | 'costPerIC'
  | 'addToCart'
  | 'costPerATC'
  | 'conversionValue'
  | 'aov'

export type MetricColumn = {
  id: MetricColumnId
  label: string
  // MetaMetrics (no MetaCampaign): Campañas, Conjuntos y Anuncios comparten
  // este mismo set de columnas — MetaCampaign/MetaAdSet/MetaCampaignAd son
  // todos superset estructural de MetaMetrics. `targets` es opcional: CPA y
  // ROAS lo usan para el semáforo dinámico (verde/ámbar/rojo según objetivo/
  // breakeven de la campaña) cuando está disponible; sin él (ej. comparadores
  // que todavía no pasan targets) quedan sin colorear en vez de inventar un
  // umbral fijo.
  render: (metrics: MetaMetrics, targets?: CampaignTargets) => ReactNode
  // Valor numérico crudo + dirección "mejor" — usados por los comparadores
  // (Conjuntos/Anuncios) para resaltar el ganador de cada fila. null = sin
  // dirección clara (ej. Gasto: ni más ni menos es "mejor" en sí mismo).
  // Misma dirección que el color de la propia métrica (roasColor/ctrColor/
  // cpmColor/cpcColor/frequencyColor/hookRateColor ya son monótonos en ese
  // sentido) para las que tienen umbral real; para el resto es un criterio
  // razonable (más compras/IC/ATC/valor es mejor, menos costo-por-algo es
  // mejor), no un umbral inventado.
  value: (metrics: MetaMetrics) => number
  higherIsBetter: boolean | null
  // Jerarquía visual (Pilar 3, 2026-08-06) — Gasto/ROAS/CPA son las 3 métricas
  // que definen si una campaña funciona; el resto (CTR, CPM, impresiones, IC,
  // ATC, etc.) es diagnóstico de apoyo. Antes las 17 columnas activas
  // compartían exactamente el mismo tamaño/peso de fuente en la tabla —
  // "primary" respira más grande y en negrita, "secondary" achica y atenúa
  // para que la vista no compita consigo misma. Ver METRIC_CELL_CLASS abajo.
  tier: 'primary' | 'secondary'
}

export const METRIC_CELL_CLASS: Record<MetricColumn['tier'], string> = {
  primary: 'whitespace-nowrap px-5 py-1.5 text-center text-[15px] font-bold',
  secondary: 'whitespace-nowrap px-5 py-1.5 text-center text-[12.5px] font-medium text-text-2',
}

// Mismo set y mismo orden por defecto que META_METRIC_ORDER en app.html:6619
// (recortado a las métricas que esta app realmente trae de la Graph API),
// más las 9 nuevas agregadas a pedido — atc/ic/frequency ya eran parte del
// legado (META_METRIC_DEFS, app.html:6606-6617), el resto (clics de enlace,
// cpc, costo por IC/ATC, valor de conversión, AOV) es nuevo.
//
// Fábrica, no array estático: las columnas monetarias necesitan saber en qué
// moneda mostrar el número (switch global ARS/USD, ver currency-context.tsx)
// para elegir el símbolo ($/US$) y convertir el valor. El semáforo de color
// (cpaColorByTargets/roasColorByTargets) sigue comparando SIEMPRE contra el
// valor crudo en moneda de cuenta — el diagnóstico de rentabilidad no puede
// cambiar según qué moneda estás mirando, solo cambia el número impreso.
export function buildMetricColumns(currency: {
  displayCurrency: Currency
  accountCurrency: Currency
  usdArsRate: number | null
}): MetricColumn[] {
  const { displayCurrency, accountCurrency, usdArsRate } = currency
  const money = (n: number) => formatMoney(convertAmount(n, accountCurrency, displayCurrency, usdArsRate), displayCurrency, n % 1 === 0 ? 0 : 2)

  return [
    {
      id: 'spend',
      label: 'Gasto',
      render: (c) => (c.spend > 0 ? <span className="font-semibold text-text">{money(c.spend)}</span> : '—'),
      value: (c) => c.spend,
      higherIsBetter: null,
      tier: 'primary',
    },
    {
      id: 'roas',
      label: 'ROAS',
      render: (c, targets) =>
        c.roas > 0 ? (
          <span className={`font-bold ${targets ? roasColorByTargets(c.roas, targets) : 'text-text'}`}>{c.roas.toFixed(2)}x</span>
        ) : (
          '—'
        ),
      value: (c) => c.roas,
      higherIsBetter: true,
      tier: 'primary',
    },
    {
      id: 'purchases',
      label: 'Compras',
      render: (c) => c.purchases || '—',
      value: (c) => c.purchases,
      higherIsBetter: true,
      tier: 'secondary',
    },
    {
      id: 'cpa',
      label: 'CPA',
      render: (c, targets) =>
        c.cpa > 0 ? <span className={targets ? cpaColorByTargets(c.cpa, targets) : 'text-text'}>{money(c.cpa)}</span> : '—',
      value: (c) => c.cpa,
      higherIsBetter: false,
      tier: 'primary',
    },
    {
      id: 'ctr',
      label: 'CTR',
      render: (c) => (c.ctr > 0 ? <span className={ctrColor(c.ctr)}>{c.ctr.toFixed(2)}%</span> : '—'),
      value: (c) => c.ctr,
      higherIsBetter: true,
      tier: 'secondary',
    },
    {
      id: 'cpm',
      label: 'CPM',
      render: (c) => (c.cpm > 0 ? <span className={cpmColor(c.cpm)}>{money(c.cpm)}</span> : '—'),
      value: (c) => c.cpm,
      higherIsBetter: false,
      tier: 'secondary',
    },
    {
      id: 'impressions',
      label: 'Impresiones',
      render: (c) => (c.impressions > 0 ? c.impressions.toLocaleString('es-AR') : '—'),
      value: (c) => c.impressions,
      higherIsBetter: null,
      tier: 'secondary',
    },
    {
      id: 'hookRate',
      label: 'Hook Rate',
      render: (c) => (c.hookRate > 0 ? <span className={hookRateColor(c.hookRate)}>{c.hookRate.toFixed(1)}%</span> : '—'),
      value: (c) => c.hookRate,
      higherIsBetter: true,
      tier: 'secondary',
    },
    {
      id: 'linkClicks',
      label: 'Clics',
      render: (c) => (c.linkClicks > 0 ? c.linkClicks.toLocaleString('es-AR') : '—'),
      value: (c) => c.linkClicks,
      higherIsBetter: null,
      tier: 'secondary',
    },
    {
      id: 'cpc',
      label: 'CPC',
      render: (c) => (c.cpc > 0 ? <span className={cpcColor(c.cpc)}>{money(c.cpc)}</span> : '—'),
      value: (c) => c.cpc,
      higherIsBetter: false,
      tier: 'secondary',
    },
    {
      id: 'frequency',
      label: 'Frecuencia',
      render: (c) => (c.frequency > 0 ? <span className={frequencyColor(c.frequency)}>{c.frequency.toFixed(2)}</span> : '—'),
      value: (c) => c.frequency,
      higherIsBetter: false,
      tier: 'secondary',
    },
    {
      id: 'initiateCheckout',
      label: 'IC',
      render: (c) => c.initiateCheckout || '—',
      value: (c) => c.initiateCheckout,
      higherIsBetter: true,
      tier: 'secondary',
    },
    {
      id: 'costPerIC',
      label: 'Costo/IC',
      render: (c) => (c.costPerIC > 0 ? money(c.costPerIC) : '—'),
      value: (c) => c.costPerIC,
      higherIsBetter: false,
      tier: 'secondary',
    },
    {
      id: 'addToCart',
      label: 'ATC',
      render: (c) => c.addToCart || '—',
      value: (c) => c.addToCart,
      higherIsBetter: true,
      tier: 'secondary',
    },
    {
      id: 'costPerATC',
      label: 'Costo/ATC',
      render: (c) => (c.costPerATC > 0 ? money(c.costPerATC) : '—'),
      value: (c) => c.costPerATC,
      higherIsBetter: false,
      tier: 'secondary',
    },
    {
      id: 'conversionValue',
      label: 'Valor Conv.',
      render: (c) => (c.revenue > 0 ? <span className="font-semibold text-text">{money(c.revenue)}</span> : '—'),
      value: (c) => c.revenue,
      higherIsBetter: true,
      tier: 'secondary',
    },
    {
      id: 'aov',
      label: 'AOV',
      render: (c) => (c.aov > 0 ? money(c.aov) : '—'),
      value: (c) => c.aov,
      higherIsBetter: null,
      tier: 'secondary',
    },
  ]
}

// Mismo default que loadMetaColumns() en app.html:6626 — las 9 nuevas quedan
// disponibles en el selector pero no activas por default, para no saturar
// la tabla de entrada.
export const DEFAULT_COLUMN_IDS: MetricColumnId[] = ['spend', 'roas', 'purchases', 'cpa', 'ctr', 'cpm', 'impressions', 'hookRate']
export const COLUMNS_STORAGE_KEY = 'gotix_meta_cols_v1'

// Para el selector de columnas (ColumnsPopover) — solo necesita id+label,
// no le importa la moneda. Se deriva de la fábrica con valores neutros en
// vez de duplicar los 17 labels a mano en otro lado.
export const METRIC_LABELS: { id: MetricColumnId; label: string }[] = buildMetricColumns({
  displayCurrency: 'ARS',
  accountCurrency: 'ARS',
  usdArsRate: null,
}).map((c) => ({ id: c.id, label: c.label }))
