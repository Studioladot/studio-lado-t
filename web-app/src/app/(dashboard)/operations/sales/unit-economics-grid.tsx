'use client'

import { InfoIcon } from '@/components/features/nav-icons'
import type { CustomerEconomics } from '@/lib/tiendanube/orders'

// "Economía Unitaria" (2026-08-12) — pedido explícito: mismo nivel de
// detalle que Palanca (Impuestos, Márgenes, CAC, LTV, Recompra, Frecuencia,
// ratios), con un botón de info por métrica. Todo se deriva de datos que
// operations/sales/page.tsx YA trae (currentOrders, waterfall, metaSpendArs,
// opexProrated) — cero fetch nuevo, salvo el campo `customer` de las
// órdenes de Tienda Nube (ver lib/tiendanube/orders.ts), que no se pudo
// verificar contra documentación en vivo en esta sesión.
//
// Honestidad de datos: Recompra/Frecuencia/CAC/LTV están calculados DENTRO
// del período elegido en el selector de fechas, no son "de por vida" —
// Tienda Nube no expone historial de cliente fuera del rango pedido sin un
// fetch aparte por cliente. Cada tooltip lo aclara.

export type UnitEconomics = {
  impuestosPct: number | null
  margenBrutoPct: number
  gananciaNeta: number
  unidadesVendidas: number
  costoPromedioPorPedido: number
  customerEconomics: CustomerEconomics
  cac: number | null
  cacBlended: number | null
  opexProrated: number
  ratioMargenBrutoCac: number | null
  ratioLtvCac: number | null
}

function money(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

function MetricCard({ label, value, tooltip, sub }: { label: string; value: string; tooltip: string; sub?: string }) {
  return (
    <div className="rounded-control border border-border bg-surface-2/60 p-3.5">
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">{label}</p>
        <span className="group relative inline-flex">
          <span className="cursor-help text-text-3 transition-colors duration-150 ease-out hover:text-accent">
            <InfoIcon size={11} />
          </span>
          <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-0 z-20 w-56 rounded-control border border-border-2 bg-surface px-2.5 py-2 text-[11px] font-normal normal-case leading-relaxed text-text-2 opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-opacity duration-150 group-hover:opacity-100">
            {tooltip}
          </span>
        </span>
      </div>
      <p className="mt-1.5 text-lg font-bold tabular-nums text-text">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-text-3">{sub}</p>}
    </div>
  )
}

export function UnitEconomicsGrid({ data, hasOrders }: { data: UnitEconomics; hasOrders: boolean }) {
  const ce = data.customerEconomics
  const noIdentifiedCustomers = hasOrders && ce.totalCustomers === 0

  return (
    <div className="rounded-card border border-border bg-surface p-6">
      <p className="mb-1 text-sm font-bold tracking-tight text-text">Economía Unitaria</p>
      <p className="mb-4 text-xs text-text-2">Rentabilidad y valor de cliente del período elegido — cruce de Tienda Nube y Meta Ads.</p>

      {noIdentifiedCustomers && (
        <div className="mb-4 rounded-control border border-amber/30 bg-amber/[6%] px-4 py-3 text-xs text-amber">
          No pudimos identificar clientes en tus órdenes de este período — Recompra, Frecuencia, CAC y LTV van a quedar en blanco
          hasta que podamos confirmarlo.
        </div>
      )}
      {!noIdentifiedCustomers && ce.unidentifiedOrders > 0 && (
        <p className="mb-4 text-[11px] text-text-3">
          {ce.unidentifiedOrders} orden{ce.unidentifiedOrders === 1 ? '' : 'es'} de este período sin cliente identificable, excluida
          {ce.unidentifiedOrders === 1 ? '' : 's'} de las métricas de abajo.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard
          label="Impuestos"
          value={data.impuestosPct !== null ? `${data.impuestosPct}%` : 'Sin configurar'}
          tooltip="IVA, Ingresos Brutos y otros impuestos configurados en Gestión de Costos — se aplican como % de la facturación bruta."
        />
        <MetricCard
          label="Margen de Ganancia Bruto"
          value={`${data.margenBrutoPct.toFixed(1)}%`}
          tooltip="Facturación Bruta menos Costo de Producto, como % de la facturación — antes de restar envío, comisiones, impuestos, Meta Ads y Costos Fijos."
        />
        <MetricCard
          label="Ganancia Neta"
          value={money(data.gananciaNeta)}
          tooltip="Resultado Neto Real del período, en pesos — el mismo número final de la Cascada de Rentabilidad de más abajo."
        />
        <MetricCard
          label="Unidades Vendidas"
          value={data.unidadesVendidas.toLocaleString('es-AR')}
          tooltip="Suma de las unidades de todas las líneas de todas las órdenes pagas del período."
        />
        <MetricCard
          label="Costo Promedio por Pedido"
          value={money(data.costoPromedioPorPedido)}
          tooltip="Costo de producto + envío + comisiones + impuestos, dividido por la cantidad de órdenes del período — no incluye Meta Ads ni Costos Fijos."
        />
        <MetricCard
          label="Tasa de Recompra"
          value={ce.repeatRatePct !== null ? `${ce.repeatRatePct.toFixed(1)}%` : '—'}
          tooltip="% de clientes identificados que compraron 2 o más veces DENTRO de este período — no es recompra de por vida, solo lo que pasó en el rango de fechas elegido."
        />
        <MetricCard
          label="Frecuencia de Compra"
          value={ce.avgDaysBetweenPurchases !== null ? `${Math.round(ce.avgDaysBetweenPurchases)} días` : '—'}
          tooltip="Cada cuántos días vuelve a comprar, en promedio, un cliente que ya recompró dentro de este período."
        />
        <MetricCard
          label="Compras por Cliente Promedio"
          value={ce.avgOrdersPerCustomer !== null ? ce.avgOrdersPerCustomer.toFixed(2) : '—'}
          tooltip="Cantidad promedio de órdenes por cliente identificado, dentro del período elegido."
        />
        <MetricCard
          label="CAC"
          value={data.cac !== null ? money(data.cac) : 'Sin datos suficientes'}
          tooltip="Gasto de Meta Ads del período dividido por la cantidad de clientes distintos identificados — no distingue clientes nuevos de recurrentes, Tienda Nube no expone esa antigüedad en las órdenes."
        />
        <MetricCard
          label="LTV (Ingreso Prom. por Cliente)"
          value={ce.avgRevenuePerCustomer !== null ? money(ce.avgRevenuePerCustomer) : '—'}
          tooltip="Facturación promedio por cliente identificado, DENTRO de este período — no es el valor de por vida completo del cliente, Tienda Nube no expone su historial fuera del rango elegido."
        />
        <MetricCard
          label="Ratio Margen Bruto / CAC"
          value={data.ratioMargenBrutoCac !== null ? `${data.ratioMargenBrutoCac.toFixed(2)}x` : '—'}
          tooltip="Margen bruto en pesos que deja un cliente promedio, dividido por lo que costó conseguirlo (CAC) — arriba de 1x, el margen ya cubre el costo de adquisición."
        />
        <MetricCard
          label="Ratio LTV / CAC"
          value={data.ratioLtvCac !== null ? `${data.ratioLtvCac.toFixed(2)}x` : '—'}
          tooltip="Ingreso promedio por cliente (del período) dividido por el CAC — en e-commerce suele considerarse saludable a partir de 3x."
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard
          label="Gastos Operativos para CAC Blended"
          value={money(data.opexProrated)}
          tooltip="Costos Fijos (OpEx) configurados en Gestión de Costos, prorrateados a este período — se suman al gasto de Meta Ads para calcular el CAC Blended."
        />
        <MetricCard
          label="CAC Blended"
          value={data.cacBlended !== null ? money(data.cacBlended) : 'Sin datos suficientes'}
          tooltip="(Gasto de Meta Ads + Costos Fijos prorrateados) dividido por la cantidad de clientes distintos identificados — el costo de adquisición 'real' incluyendo la estructura, no solo la pauta."
        />
      </div>
    </div>
  )
}
