'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PeriodSelector } from './period-selector'
import { WaterfallChart } from './waterfall-chart'
import { DailyRevenueChart } from './daily-revenue-chart'
import { Sparkline } from './sparkline'
import { SalesTabs, type SalesTab } from './sales-tabs'
import { TiendaConnectionCard } from './tienda-connection-card'
import { ProductCards } from './product-cards'
import type { ManualSale } from '@/lib/tiendanube/sales'
import type { FinConfig, ProfitWaterfall } from '@/lib/tiendanube/finance'
import type { TiendaNubeSalesSummary, DailySalesPoint, ProductRanking, OrderLedgerEntry } from '@/lib/tiendanube/orders'
import type { Insight } from '@/lib/tiendanube/insights'
import type { ProductCost } from '@/lib/tiendanube/product-costs'
import type { TiendaNubeProductVariant } from '@/lib/tiendanube/products'
import type { CheckoutFunnelSummary, TiendaNubeCheckout } from '@/lib/tiendanube/checkouts'
import type { TiendaNubeCoupon } from '@/lib/tiendanube/coupons'
import type { OperatingCost } from '@/lib/tiendanube/operating-costs'

// Dashboard de Rentabilidad Neta — shell persistente (refactor de pestañas,
// 2026-07-27; reconstrucción de layout legado, 2026-07-29 — ver
// app.html:2166-2254). Acá vive todo lo que en el legado estaba "arriba del
// pliegue": tarjeta de conexión, pills de acción, Inteligencia de Tienda
// (grilla 3x2) + Producto Estrella/Muertos, y Cascada + gráfico diario. El
// resto (embudos, insights, ledger, gestión de costos, venta manual,
// carritos abandonados) vive en sales-tabs.tsx.

// Íconos puntuales de esta pantalla — mismo criterio que nav-icons.tsx
// (thin-stroke, sin librería), no centralizados ahí porque son de uso único.
function StoreIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function money(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

// Tarjeta de métrica premium — puerto de .an-card del legado (app.html:
// 1166-1187): valor grande/extra-bold, delta vs. período anterior con
// flecha, sparkline de fondo. `deltaPct`/`series` son opcionales — sin
// datos, la tarjeta simplemente no muestra esa parte, nunca se inventa un
// número o una tendencia. `invertColor` es para métricas donde bajar es
// bueno (CPA, costos) — invierte qué signo de delta se pinta de verde.
function KpiCard({
  label,
  value,
  sub,
  deltaPct,
  series,
  invertColor,
}: {
  label: string
  value: string
  sub?: string
  deltaPct?: number | null
  series?: number[]
  invertColor?: boolean
}) {
  const showDelta = deltaPct !== null && deltaPct !== undefined && Math.abs(deltaPct) > 0.5
  const isGood = !showDelta ? true : invertColor ? deltaPct! < 0 : deltaPct! > 0
  const arrow = !showDelta ? null : deltaPct! > 0 ? '↑' : deltaPct! < 0 ? '↓' : '—'

  const hasSpark = Boolean(series && series.length >= 2)

  return (
    <div className="metric-card flex min-h-[108px] flex-col justify-between rounded-card px-4 pb-3 pt-3.5">
      {/* padding-right reserva el espacio del sparkline (mismo criterio que
          .an-card-val-row{padding-right:70px} del legado, app.html:1181) —
          sin esto, el sub-texto choca con el gráfico cuando el delta pasa a
          su propia línea en tarjetas angostas. */}
      <div className={hasSpark ? 'pr-[70px]' : undefined}>
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">{label}</p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
          <p className="text-2xl font-extrabold tracking-tight tabular-nums text-text">{value}</p>
          {showDelta && (
            <span className={`text-[11px] font-bold ${isGood ? 'text-green' : 'text-red'}`}>
              {arrow} {Math.abs(deltaPct!).toFixed(1)}%
            </span>
          )}
        </div>
        {sub && <p className="mt-0.5 text-[11px] text-text-3">{sub}</p>}
      </div>
      {hasSpark && <Sparkline series={series!} isGood={isGood} />}
    </div>
  )
}

// Chip de estadística secundaria — versión compacta de KpiCard sin
// sparkline, para acompañar al hero de Margen Neto sin competirle en
// tamaño (rediseño premium, bloque de corrección 2026-08-03).
function StatChip({ label, value, sub, deltaPct, invertColor }: { label: string; value: string; sub?: string; deltaPct?: number | null; invertColor?: boolean }) {
  const showDelta = deltaPct !== null && deltaPct !== undefined && Math.abs(deltaPct) > 0.5
  const isGood = !showDelta ? true : invertColor ? deltaPct! < 0 : deltaPct! > 0
  const arrow = !showDelta ? null : deltaPct! > 0 ? '↑' : deltaPct! < 0 ? '↓' : '—'

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">{label}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
        <p className="text-lg font-bold tabular-nums text-text">{value}</p>
        {showDelta && (
          <span className={`text-[10px] font-bold ${isGood ? 'text-green' : 'text-red'}`}>
            {arrow} {Math.abs(deltaPct!).toFixed(1)}%
          </span>
        )}
      </div>
      {sub && <p className="mt-0.5 text-[10px] text-text-3">{sub}</p>}
    </div>
  )
}

type Channel = 'tn' | 'consolidado'

const METRIC_KEYS = ['ventas', 'facturacion', 'ticket', 'creados', 'abandonados', 'conversion'] as const
type MetricKey = (typeof METRIC_KEYS)[number]
const METRIC_LABELS: Record<MetricKey, string> = {
  ventas: 'Ventas',
  facturacion: 'Facturación',
  ticket: 'Ticket promedio',
  creados: 'Carritos creados',
  abandonados: 'Carritos abandonados',
  conversion: 'Conversión de checkout',
}

export function SalesWorkspace({
  activePreset,
  customFrom,
  customTo,
  tnConnected,
  tnError,
  ordersTruncated,
  checkoutsTruncated,
  costsLoadError,
  storeName,
  lastSyncedAt,
  metaConnected,
  hasMetaSpend,
  summary,
  waterfall,
  dailyData,
  ranking,
  ledger,
  insights,
  funnelSteps,
  kpis,
  trends,
  series,
  currencyMismatchNoRate,
  manualSales,
  manualTotal,
  finConfig,
  costsList,
  catalog,
  operatingCosts,
  checkoutFunnel,
  checkoutError,
  abandonedCheckouts,
  coupons,
}: {
  activePreset: number | null
  customFrom: string | null
  customTo: string | null
  tnConnected: boolean
  tnError: string | null
  /** true = se llegó al tope de 4000 filas (20 páginas × 200) para el período pedido — el dato mostrado puede estar incompleto. */
  ordersTruncated: boolean
  checkoutsTruncated: boolean
  /** Falla real de lectura en fin_config/product_costs/operating_costs — no "todavía no configuró nada" (ver finance.ts:getFinConfig). */
  costsLoadError: boolean
  storeName: string | null
  lastSyncedAt: string
  metaConnected: boolean
  hasMetaSpend: boolean
  summary: TiendaNubeSalesSummary
  waterfall: ProfitWaterfall
  dailyData: DailySalesPoint[]
  ranking: ProductRanking
  ledger: OrderLedgerEntry[]
  insights: Insight[]
  funnelSteps: { label: string; value: number }[]
  kpis: { roasReal: number; cpaReal: number; aov: number; mer: number; margenPct: number }
  /** vs. período anterior — `null` cuando no hay base de comparación (ej. período previo sin órdenes), nunca se inventa. */
  trends: {
    bruto: number | null
    neto: number | null
    margenPct: number | null
    roas: number | null
    mer: number | null
    cpa: number | null
    aov: number | null
    ordenes: number | null
    carritosCreados: number | null
    abandonados: number | null
    conversion: number | null
  }
  /** Series diarias del período actual, para las sparklines — solo Tienda Nube (ver plan: ROAS/CPA/MER/Carritos necesitarían datos día por día que no se traen). */
  series: { bruto: number[]; neto: number[]; aov: number[]; ordenes: number[] }
  currencyMismatchNoRate: boolean
  manualSales: ManualSale[]
  manualTotal: number
  finConfig: FinConfig
  costsList: ProductCost[]
  catalog: TiendaNubeProductVariant[]
  operatingCosts: OperatingCost[]
  checkoutFunnel: CheckoutFunnelSummary
  checkoutError: string | null
  abandonedCheckouts: TiendaNubeCheckout[]
  coupons: TiendaNubeCoupon[]
}) {
  const [channel, setChannel] = useState<Channel>('tn')
  const [tab, setTab] = useState<SalesTab>('resumen')
  const [metricsConfigOpen, setMetricsConfigOpen] = useState(false)
  const [visibleMetrics, setVisibleMetrics] = useState<Record<MetricKey, boolean>>({
    ventas: true,
    facturacion: true,
    ticket: true,
    creados: true,
    abandonados: true,
    conversion: true,
  })

  function goToTab(target: SalesTab) {
    setTab(target)
    document.getElementById('sales-tabs-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const brutoDisplay = channel === 'tn' ? summary.bruto : summary.bruto + manualTotal
  const metaMetricsAvailable = metaConnected && hasMetaSpend

  return (
    <div className="flex flex-col gap-6">
      {/* Banners agrupados con su propio gap más ajustado (rediseño premium,
          2026-08-03) — bajo gap-6 del contenedor general, 2-3 banners
          simultáneos quedaban con demasiado aire entre sí; acá se pegan
          entre ellos y el espacio grande queda para separar del resto. */}
      <div className="flex flex-col gap-2.5">
      {/* Modo fallback — un usuario nuevo sin tienda conectada todavía tiene
          que poder usar venta manual/showroom y configuración financiera sin
          que la pantalla se rompa. */}
      {!tnConnected && (
        <div className="flex items-center justify-between gap-4 rounded-card border border-dashed border-border bg-surface-2/40 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-text">Todavía no conectaste Tienda Nube</p>
            <p className="mt-0.5 text-xs text-text-2">
              El Dashboard de Rentabilidad Neta necesita tus órdenes reales — mientras tanto podés cargar venta manual/showroom en la pestaña Showroom.
            </p>
          </div>
          <Link
            href="/settings/integrations"
            className="shrink-0 rounded-control bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
          >
            Conectar tienda
          </Link>
        </div>
      )}
      {tnConnected && tnError && (
        <div className="rounded-control border border-red/30 bg-red/[6%] px-4 py-3 text-sm text-red">
          No pudimos traer las órdenes de Tienda Nube: {tnError}
        </div>
      )}
      {tnConnected && checkoutError && (
        <div className="rounded-control border border-red/30 bg-red/[6%] px-4 py-3 text-sm text-red">
          No pudimos traer los carritos de Tienda Nube: {checkoutError}
        </div>
      )}
      {/* Suavizado (rediseño 2026-08-03, pedido explícito de la PO): esto
          sigue disparando solo ante una falla real de lectura (ver
          finance.ts:getFinConfig), pero un banner rojo agresivo no es el
          tono correcto para "configurá esto" — se trata como una invitación
          a revisar Costos, no como una alarma. */}
      {costsLoadError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-dashed border-border bg-surface-2/40 px-4 py-3">
          <p className="text-xs text-text-2">
            No pudimos traer tu configuración de costos — la Cascada y el Ledger pueden estar mostrando estos valores en $0. Revisalos en Gestión de Costos.
          </p>
          <button
            type="button"
            onClick={() => goToTab('costos')}
            className="shrink-0 text-xs font-semibold text-accent transition-colors duration-200 ease-out hover:text-accent/80"
          >
            Configurar →
          </button>
        </div>
      )}
      {!metaConnected && tnConnected && (
        <div className="rounded-control border border-amber/30 bg-amber/[6%] px-4 py-3 text-xs text-amber">
          Conectá Meta Ads para ver ROAS Real, CPA Real y MER — sin eso, la Cascada solo resta costo de producto, envíos y pasarelas.
        </div>
      )}
      {currencyMismatchNoRate && (
        <div className="rounded-control border border-amber/30 bg-amber/[6%] px-4 py-3 text-xs text-amber">
          No pudimos obtener la cotización del dólar ahora — el gasto de Meta se muestra sin convertir a ARS, así que ROAS/CPA Real pueden no ser exactos.
        </div>
      )}
      {(ordersTruncated || checkoutsTruncated) && (
        <div className="rounded-control border border-amber/30 bg-amber/[6%] px-4 py-3 text-xs text-amber">
          El período elegido tiene más de 4.000 {ordersTruncated && checkoutsTruncated ? 'órdenes y carritos' : ordersTruncated ? 'órdenes' : 'carritos'} —
          solo se trajeron las primeras 4.000. Los totales, la Cascada y el Ledger de este período pueden estar incompletos; probá acortar el rango de fechas.
        </div>
      )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 rounded-control border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setChannel('tn')}
            className={`rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
              channel === 'tn' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
            }`}
          >
            Tienda Nube
          </button>
          <button
            type="button"
            onClick={() => setChannel('consolidado')}
            className={`rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
              channel === 'consolidado' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
            }`}
          >
            Consolidado (+ Manual)
          </button>
        </div>
        <PeriodSelector activePreset={activePreset} customFrom={customFrom} customTo={customTo} />
      </div>

      {/* Tarjeta de conexión — puerto de #tn-connected del legado (app.html:2166-2179). */}
      {tnConnected && <TiendaConnectionCard storeName={storeName} lastSyncedAt={lastSyncedAt} />}

      {/* Pills de acción — puerto de app.html:2183-2186. Ambas navegan a
          pestañas de esta misma página (antes eran páginas legado separadas
          "finanzas" y un modal de venta manual; acá ya viven como pestañas). */}
      {tnConnected && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => goToTab('costos')}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-2 transition-all duration-200 ease-out hover:text-text"
          >
            <GearIcon /> Productos, Inventario y Ajustes
          </button>
          <button
            type="button"
            onClick={() => goToTab('showroom')}
            className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
          >
            + Venta manual / showroom
          </button>
        </div>
      )}

      {/* Inteligencia de Tienda — puerto de #tn-advanced-panel del legado
          (app.html:2192-2232), grilla estricta de 3 columnas x 2 filas. */}
      <div className="metric-card rounded-card p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-2">
              <StoreIcon />
            </span>
            <h2 className="text-sm font-bold tracking-tight text-text">Inteligencia de tienda</h2>
          </div>
          <button
            type="button"
            onClick={() => setMetricsConfigOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-control border border-border px-3 py-1.5 text-xs font-semibold text-text-2 transition-colors duration-200 ease-out hover:text-text"
          >
            <GearIcon /> Métricas
          </button>
        </div>

        {metricsConfigOpen && (
          <div className="mb-3.5 flex flex-wrap gap-x-4 gap-y-2 rounded-control bg-surface-2/60 p-2.5">
            {METRIC_KEYS.map((key) => (
              <label key={key} className="flex cursor-pointer items-center gap-1.5 text-xs text-text-2">
                <input
                  type="checkbox"
                  checked={visibleMetrics[key]}
                  onChange={() => setVisibleMetrics((prev) => ({ ...prev, [key]: !prev[key] }))}
                />
                {METRIC_LABELS[key]}
              </label>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {visibleMetrics.ventas && (
            <KpiCard label="Ventas" value={`${summary.ordenes}`} deltaPct={trends.ordenes} series={series.ordenes} />
          )}
          {visibleMetrics.facturacion && <KpiCard label="Facturación" value={money(brutoDisplay)} deltaPct={trends.bruto} series={series.bruto} />}
          {visibleMetrics.ticket && <KpiCard label="Ticket promedio" value={money(kpis.aov)} deltaPct={trends.aov} series={series.aov} />}
          {visibleMetrics.creados && (
            <KpiCard label="Carritos creados" value={`${checkoutFunnel.carritosCreados}`} deltaPct={trends.carritosCreados} />
          )}
          {visibleMetrics.abandonados && (
            <KpiCard
              label="Carritos abandonados"
              value={`${checkoutFunnel.abandonados}`}
              deltaPct={trends.abandonados}
              invertColor
            />
          )}
          {visibleMetrics.conversion && (
            <KpiCard label="Conversión de checkout" value={`${checkoutFunnel.tasaConversion.toFixed(1)}%`} deltaPct={trends.conversion} />
          )}
        </div>

        <div className="mt-5">
          <ProductCards ranking={ranking} />
        </div>
      </div>

      {/* Resultado del Negocio — rediseño premium (2026-08-03): Margen Neto
          es el número que de verdad responde "¿cómo venimos?", así que pasa
          a ser un hero (tipografía grande, tarjeta propia) en vez de
          competir en tamaño con ROAS/MER/CPA Real dentro de la misma
          grilla de 4 columnas — esos 3 acompañan como stats secundarios. */}
      <div className="rounded-card border border-border bg-surface p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-text-3">Margen Neto</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <p className="text-[40px] font-extrabold leading-none tracking-tight tabular-nums text-text">
                {summary.bruto > 0 ? `${kpis.margenPct.toFixed(1)}%` : '—'}
              </p>
              {trends.margenPct !== null && Math.abs(trends.margenPct) > 0.5 && (
                <span className={`text-xs font-bold ${trends.margenPct > 0 ? 'text-green' : 'text-red'}`}>
                  {trends.margenPct > 0 ? '↑' : '↓'} {Math.abs(trends.margenPct).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-text-3">Resultado Neto Real sobre Facturación Bruta</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-divider pt-4 sm:grid-cols-3">
          <StatChip
            label="ROAS Real"
            value={metaMetricsAvailable ? `${kpis.roasReal.toFixed(2)}x` : metaConnected ? 'Sin gasto en el período' : '—'}
            sub="Neta / Spend Meta"
            deltaPct={metaMetricsAvailable ? trends.roas : null}
          />
          <StatChip
            label="MER"
            value={metaMetricsAvailable ? `${kpis.mer.toFixed(2)}x` : metaConnected ? 'Sin gasto en el período' : '—'}
            sub="Bruta / Spend Meta"
            deltaPct={metaMetricsAvailable ? trends.mer : null}
          />
          <StatChip
            label="CPA Real"
            value={metaMetricsAvailable ? money(kpis.cpaReal) : metaConnected ? 'Sin gasto en el período' : '—'}
            sub="(Ads + Costo + Envío) / Órdenes"
            deltaPct={metaMetricsAvailable ? trends.cpa : null}
            invertColor
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WaterfallChart waterfall={waterfall} />
        <DailyRevenueChart data={dailyData} />
      </div>

      <div id="sales-tabs-section">
        <SalesTabs
          activeTab={tab}
          onTabChange={setTab}
          tnConnected={tnConnected}
          funnelSteps={funnelSteps}
          insights={insights}
          ledger={ledger}
          checkoutFunnel={checkoutFunnel}
          abandonedCheckouts={abandonedCheckouts}
          coupons={coupons}
          costsList={costsList}
          catalog={catalog}
          operatingCosts={operatingCosts}
          finConfig={finConfig}
          manualSales={manualSales}
          manualTotal={manualTotal}
        />
      </div>
    </div>
  )
}
