'use client'

import { useState, type FormEvent } from 'react'
import { addManualSaleAction, deleteManualSaleAction, saveFinConfigAction } from './actions'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { FunnelPanel } from './funnel-panel'
import { InsightsPanel } from './insights-panel'
import { LedgerTable } from './ledger-table'
import { ProductCostsManager } from './product-costs-manager'
import { OperatingCostsCard } from './operating-costs-card'
import { AbandonedCartsList } from './abandoned-carts-list'
import type { Insight } from '@/lib/tiendanube/insights'
import type { OrderLedgerEntry } from '@/lib/tiendanube/orders'
import type { CheckoutFunnelSummary, TiendaNubeCheckout } from '@/lib/tiendanube/checkouts'
import type { TiendaNubeCoupon } from '@/lib/tiendanube/coupons'
import type { ProductCost } from '@/lib/tiendanube/product-costs'
import type { TiendaNubeProductVariant } from '@/lib/tiendanube/products'
import type { FinConfig } from '@/lib/tiendanube/finance'
import type { ManualSale } from '@/lib/tiendanube/sales'
import type { OperatingCost } from '@/lib/tiendanube/operating-costs'

// Pestañas de /operations/sales (2026-07-27) — antes todo esto vivía apilado
// en sales-workspace.tsx, 11 bloques heterogéneos compitiendo por atención.
// Mismo patrón de pestañas que content-tabs.tsx/library-tabs.tsx (useState
// local, no sincronizado con la URL, tira underline+accent).

const FIELD_CLASS =
  'rounded-control border border-border bg-surface-2/60 px-3 py-2 text-sm text-text outline-none transition-all duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent'
const labelClass = 'flex flex-col gap-1.5 text-xs font-medium text-text-2'

function money(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function ManualSaleForm() {
  const [fecha, setFecha] = useState(todayISO())
  const [canal, setCanal] = useState('Showroom')
  const [unidades, setUnidades] = useState('1')
  const [monto, setMonto] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await addManualSaleAction({
      fecha,
      canal,
      unidades: Number(unidades) || 1,
      monto: Number(monto) || 0,
      notas: notas.trim() || null,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMonto('')
    setNotas('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2.5 rounded-control border border-border bg-surface-2/40 p-3.5">
      <label className={labelClass}>
        Fecha
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${FIELD_CLASS} w-[150px]`} />
      </label>
      <label className={labelClass}>
        Canal
        <input type="text" value={canal} onChange={(e) => setCanal(e.target.value)} className={`${FIELD_CLASS} w-[130px]`} />
      </label>
      <label className={labelClass}>
        Unidades
        <input type="number" min={1} value={unidades} onChange={(e) => setUnidades(e.target.value)} className={`${FIELD_CLASS} w-[90px]`} />
      </label>
      <label className={labelClass}>
        Monto
        <input type="number" min={0} step="any" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" className={`${FIELD_CLASS} w-[120px]`} />
      </label>
      <label className={`${labelClass} min-w-[160px] flex-1`}>
        Notas (opcional)
        <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} className={FIELD_CLASS} />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded-control bg-primary px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
      >
        {saving ? 'Guardando…' : '+ Venta'}
      </button>
      {error && <p className="w-full text-xs text-red">{error}</p>}
    </form>
  )
}

function FinConfigCard({ initial }: { initial: FinConfig }) {
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function setField(key: keyof FinConfig, raw: string) {
    setValues((prev) => ({ ...prev, [key]: raw === '' ? null : Number(raw) }))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const result = await saveFinConfigAction(values)
    setSaving(false)
    if (result.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const fields: { key: keyof FinConfig; label: string; placeholder: string }[] = [
    { key: 'comisionTnPct', label: 'Comisión Tienda Nube (%)', placeholder: '5' },
    { key: 'pasarelaPct', label: 'Comisión Pasarela (%)', placeholder: '6.5' },
    { key: 'impuestosPct', label: 'Impuestos (%)', placeholder: '3' },
    { key: 'costoEnvioPromedio', label: 'Costo real de envío por orden', placeholder: '2500' },
    { key: 'margenBruto', label: 'Margen bruto (%)', placeholder: '48' },
    { key: 'objetivoGananciaPct', label: 'Objetivo de ganancia (%)', placeholder: '15' },
    { key: 'presupuestoAdsMensual', label: 'Presupuesto de ads mensual', placeholder: '300000' },
  ]

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Configuración financiera</p>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-control bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 ease-out hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.key} className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-text-2">{f.label}</span>
            <input
              type="number"
              step="any"
              value={values[f.key] ?? ''}
              onChange={(e) => setField(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-28 rounded-control border border-border bg-surface-2/60 px-2.5 py-1.5 text-right text-xs text-text outline-none transition-all duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent"
            />
          </label>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-text-3">
        Tienda Nube no expone el costo real de envío por ninguna API — sin este número, la Cascada usa el envío cobrado al cliente como
        aproximación (puede quedar corto si tenés envío gratis o subsidiado).
      </p>
      {saved && (
        <p className="mt-1.5 text-[11px] text-text-2">
          Guardado. Estos porcentajes ya se usan como Comisión Tienda Nube, Comisión Pasarela e Impuestos en la Cascada de Rentabilidad y en la
          Radiografía de cada orden del Ledger Neto.
        </p>
      )}
    </div>
  )
}

export const SALES_TABS = [
  { value: 'resumen', label: 'Resumen de Rentabilidad' },
  { value: 'costos', label: 'Gestión de Costos' },
  { value: 'showroom', label: 'Venta Manual (Showroom)' },
  { value: 'recuperacion', label: 'Recuperación (Carritos)' },
] as const

export type SalesTab = (typeof SALES_TABS)[number]['value']

export function SalesTabs({
  activeTab,
  onTabChange,
  tnConnected,
  funnelSteps,
  insights,
  ledger,
  checkoutFunnel,
  abandonedCheckouts,
  coupons,
  costsList,
  catalog,
  operatingCosts,
  finConfig,
  manualSales,
  manualTotal,
}: {
  activeTab: SalesTab
  onTabChange: (tab: SalesTab) => void
  tnConnected: boolean
  funnelSteps: { label: string; value: number }[]
  insights: Insight[]
  ledger: OrderLedgerEntry[]
  checkoutFunnel: CheckoutFunnelSummary
  abandonedCheckouts: TiendaNubeCheckout[]
  coupons: TiendaNubeCoupon[]
  costsList: ProductCost[]
  catalog: TiendaNubeProductVariant[]
  operatingCosts: OperatingCost[]
  finConfig: FinConfig
  manualSales: ManualSale[]
  manualTotal: number
}) {
  return (
    <div>
      <div className="mb-5 flex gap-0 overflow-x-auto border-b border-border">
        {SALES_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onTabChange(t.value)}
            className={`shrink-0 px-4 pb-2.5 text-[13px] font-semibold transition-colors duration-200 ease-out ${
              activeTab === t.value ? 'border-b-2 border-accent text-accent' : 'border-b-2 border-transparent text-text-2 hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'resumen' && (
        <div className="flex flex-col gap-3">
          <FunnelPanel title="Embudo Meta Ads" steps={funnelSteps.length > 0 ? funnelSteps : [{ label: 'Sin datos de Meta', value: 0 }]} />
          <InsightsPanel insights={insights} />
          <LedgerTable ledger={ledger} />
        </div>
      )}

      {activeTab === 'costos' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ProductCostsManager costs={costsList} catalog={catalog} />
          <div className="flex flex-col gap-3">
            <OperatingCostsCard costs={operatingCosts} />
            <FinConfigCard initial={finConfig} />
          </div>
        </div>
      )}

      {activeTab === 'showroom' && (
        <div className="flex flex-col gap-3">
          <div className="rounded-card border border-accent/30 bg-accent/[0.05] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Manual / Showroom</p>
            <p className="mt-1 tabular-nums text-lg font-semibold text-text">{money(manualTotal)}</p>
            <p className="mt-0.5 text-[11px] text-text-3">{manualSales.length} ventas cargadas — se suman al total en la vista Consolidado</p>
          </div>

          <div className="rounded-card border border-border bg-surface p-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Venta manual / showroom</p>
            <ManualSaleForm />

            {manualSales.length === 0 ? (
              <p className="mt-4 text-center text-xs text-text-3">Sin ventas manuales cargadas todavía.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-1.5">
                {manualSales.map((sale) => (
                  <li key={sale.id} className="flex items-center justify-between gap-3 rounded-control border border-border bg-surface-2/60 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text">
                        {sale.fecha} — {sale.canal ?? 'Sin canal'} — {sale.unidades ?? 1} u.
                      </p>
                      {sale.notas && <p className="truncate text-[11px] text-text-3">{sale.notas}</p>}
                    </div>
                    <p className="shrink-0 tabular-nums text-xs font-semibold text-text">${sale.monto ?? 0}</p>
                    <form action={deleteManualSaleAction.bind(null, sale.id)}>
                      <ConfirmSubmitButton
                        confirmMessage="¿Borrar esta venta?"
                        className="shrink-0 text-[11px] font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                      >
                        Borrar
                      </ConfirmSubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 'recuperacion' && (
        <div className="flex flex-col gap-3">
          <FunnelPanel
            title="Embudo Tienda Nube"
            steps={
              tnConnected
                ? [
                    { label: 'Carritos Creados', value: checkoutFunnel.carritosCreados },
                    { label: 'Ventas Cerradas', value: checkoutFunnel.ventasCerradas },
                  ]
                : [{ label: 'Sin datos de Tienda Nube', value: 0 }]
            }
          />
          <AbandonedCartsList checkouts={abandonedCheckouts} coupons={coupons} />
        </div>
      )}
    </div>
  )
}
