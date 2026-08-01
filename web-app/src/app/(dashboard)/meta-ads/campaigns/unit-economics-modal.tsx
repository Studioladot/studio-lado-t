'use client'

import { createPortal } from 'react-dom'
import { useMemo, useState, type ReactNode } from 'react'
import { calculateUnitEconomics, type UnitEconomicsInputs, type UnitEconomicsResult } from '@/lib/meta/autopilot'
import { useCurrency } from '@/lib/context/currency-context'
import { convertAmount, formatMoney } from '@/lib/currency'
import { InfoIcon } from '@/components/features/nav-icons'

// Clases compartidas para sacar el spinner nativo de los <input type="number">
// — sin esto las flechitas arriba/abajo del navegador se superponen con el
// sufijo (%, $) que ya va adentro del mismo contenedor. Chrome/Safari/Edge
// (WebKit) necesitan las pseudo-clases de spin-button; Firefox necesita
// -moz-appearance:textfield. Ambas vía variantes arbitrarias de Tailwind,
// no hace falta tocar globals.css por un solo componente.
const NUMBER_INPUT_CLASS =
  'w-full bg-transparent text-sm font-semibold tabular-nums text-text outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

const TOOLTIPS: Record<keyof UnitEconomicsInputs, string> = {
  aov: 'El gasto promedio de un cliente por compra. Encontralo en tu panel de Tiendanube (ticket promedio o valor medio de pedido).',
  costProductPct: 'Cuánto te cuesta fabricar o comprar lo que vendés, como % del precio de venta — no incluye envío ni impuestos.',
  paymentFeesPct: 'Lo que te cobra el medio de pago por procesar la venta: Mercado Pago, tarjetas, cuotas. Varía según cómo te paga el cliente.',
  taxesPct: 'IVA, Ingresos Brutos y otros impuestos que se llevan una parte de cada venta.',
  desiredMarginPct: 'Cuánto querés ganar de verdad por cada venta, después de descontar todos los costos de arriba.',
}

const SIMPLE_FIELD_DEFS: { key: keyof UnitEconomicsInputs; label: string; suffix: string; step: string }[] = [
  { key: 'taxesPct', label: 'Impuestos', suffix: '%', step: '0.5' },
  { key: 'desiredMarginPct', label: 'Margen de Ganancia Deseado', suffix: '%', step: '0.5' },
]

// Puntos de partida, no tarifas garantizadas — las comisiones reales varían
// por plan/volumen negociado y cambian con el tiempo (el legado tampoco las
// hardcodeaba: `esc-sub-comisiones` en app.html deja la comisión 100% a
// cargo del usuario, sin valores de fábrica). El campo sigue siendo 100%
// editable a mano; esto es solo un atajo.
const PAYMENT_FEE_PRESETS: { label: string; value: number }[] = [
  { label: 'Transferencia (0%)', value: 0 },
  { label: 'Mercado Pago — Al instante', value: 6.49 },
  { label: 'Cuota Simple — 3 Cuotas', value: 7.49 },
  { label: 'Cuota Simple — 6 Cuotas', value: 9.49 },
]

function FieldLabel({ text, tooltip }: { text: string; tooltip: string }) {
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-text-2">
      {text}
      <span className="group relative inline-flex">
        <span className="cursor-help text-text-3 transition-colors duration-150 ease-out hover:text-accent">
          <InfoIcon size={11} />
        </span>
        <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 w-56 -translate-x-1/2 rounded-control border border-border-2 bg-surface px-2.5 py-2 text-[11px] font-normal normal-case leading-relaxed text-text-2 opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-opacity duration-150 group-hover:opacity-100">
          {tooltip}
        </span>
      </span>
    </span>
  )
}

function OutputCard({
  label,
  primaryValue,
  primarySuffix,
  secondaryLine,
  tone,
}: {
  label: string
  primaryValue: string
  primarySuffix: string
  secondaryLine: ReactNode
  tone: 'neutral' | 'accent'
}) {
  return (
    <div className={`rounded-control border p-3.5 ${tone === 'accent' ? 'border-accent/30 bg-accent/[0.05]' : 'border-border bg-surface-2/60'}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums text-text">
        {primaryValue}
        <span className="ml-1 text-sm font-medium text-text-3">{primarySuffix}</span>
      </p>
      {secondaryLine && <p className="mt-0.5 text-[11px] text-text-3">{secondaryLine}</p>}
    </div>
  )
}

export function UnitEconomicsModal({
  open,
  onClose,
  initialInputs,
  suggestedAov,
  onApply,
}: {
  open: boolean
  onClose: () => void
  initialInputs: UnitEconomicsInputs | null
  suggestedAov?: number
  onApply: (result: UnitEconomicsResult, inputs: UnitEconomicsInputs) => void | Promise<void>
}) {
  const { displayCurrency, accountCurrency, usdArsRate } = useCurrency()
  // Si estás mirando en una moneda distinta a la de la cuenta y no hay
  // cotización disponible, no se puede guardar sin riesgo de guardar un
  // número en la moneda equivocada (ver applyUnitEconomics en
  // autopilot-panel.tsx, que convierte de vuelta a accountCurrency antes de
  // persistir) — se bloquea "Aplicar" en vez de arriesgar la conversión.
  const currencyMismatchNoRate = displayCurrency !== accountCurrency && usdArsRate === null
  const [inputs, setInputs] = useState<UnitEconomicsInputs>(
    initialInputs ?? {
      aov: suggestedAov && suggestedAov > 0 ? Math.round(suggestedAov) : 0,
      costProductPct: 30,
      paymentFeesPct: 8,
      taxesPct: 6,
      desiredMarginPct: 15,
    }
  )
  const [applying, setApplying] = useState(false)

  const result = useMemo(() => calculateUnitEconomics(inputs), [inputs])
  const otherCurrency = displayCurrency === 'ARS' ? 'USD' : 'ARS'
  const moneySymbol = displayCurrency === 'USD' ? 'US$' : '$'

  if (!open) return null

  function setField(key: keyof UnitEconomicsInputs, value: string) {
    setInputs((prev) => ({ ...prev, [key]: Number(value) }))
  }

  async function handleApply() {
    if (result.error) return
    setApplying(true)
    // Los resultados se calculan en displayCurrency (la moneda que se está
    // mirando ahora) — se guardan tal cual, en esa misma moneda; el switch
    // global es la única fuente de verdad de "en qué moneda estoy pensando
    // los números" en este momento, no hay una segunda conversión oculta acá.
    await onApply(result, inputs)
    setApplying(false)
  }

  function secondaryConversion(amountInDisplayCurrency: number) {
    if (usdArsRate === null) return null
    const converted = convertAmount(amountInDisplayCurrency, displayCurrency, otherCurrency, usdArsRate)
    return `≈ ${formatMoney(converted, otherCurrency, 2)}`
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-[680px] max-w-full flex-col rounded-card border border-border bg-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Unit Economics</p>
            <h2 className="mt-0.5 text-[17px] font-bold tracking-[-0.02em] text-text">Calculadora de Rentabilidad</h2>
            <p className="mt-1 text-xs text-text-2">
              Definí cuánto podés pagar por una compra antes de perder plata, y cuánto necesitás pagar para cumplir el margen que buscás.
              Los montos están en {displayCurrency} — cambiá la moneda desde el switch del menú si operás en la otra.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-text-3 outline-none transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-6 overflow-y-auto px-6 py-5">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Variables del Negocio</p>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <FieldLabel text="Ticket Promedio de Venta" tooltip={TOOLTIPS.aov} />
                <div className="flex items-center gap-2 rounded-control border border-border bg-surface-2/60 px-3 py-2 transition-all duration-200 ease-out focus-within:border-accent focus-within:ring-2 focus-within:ring-accent">
                  <input
                    type="number"
                    step="1"
                    min={0}
                    value={inputs.aov || ''}
                    onChange={(e) => setField('aov', e.target.value)}
                    className={NUMBER_INPUT_CLASS}
                  />
                  <span className="shrink-0 text-xs font-medium text-text-3">{moneySymbol}</span>
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <FieldLabel text="Costo de Producto" tooltip={TOOLTIPS.costProductPct} />
                <div className="flex items-center gap-2 rounded-control border border-border bg-surface-2/60 px-3 py-2 transition-all duration-200 ease-out focus-within:border-accent focus-within:ring-2 focus-within:ring-accent">
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={inputs.costProductPct || ''}
                    onChange={(e) => setField('costProductPct', e.target.value)}
                    className={NUMBER_INPUT_CLASS}
                  />
                  <span className="shrink-0 text-xs font-medium text-text-3">%</span>
                </div>
              </label>

              {/* Sistema híbrido: el desplegable solo autocompleta el número — el
                  input queda 100% editable a mano después, no hay lock-in. El
                  select vuelve a su placeholder después de cada elección (no
                  se queda "pegado" mostrando un preset que ya no coincide si
                  el usuario después edita el número a mano). */}
              <label className="flex flex-col gap-1.5">
                <FieldLabel text="Costos de Financiación y Pasarelas" tooltip={TOOLTIPS.paymentFeesPct} />
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-1 items-center gap-2 rounded-control border border-border bg-surface-2/60 px-3 py-2 transition-all duration-200 ease-out focus-within:border-accent focus-within:ring-2 focus-within:ring-accent">
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={inputs.paymentFeesPct || ''}
                      onChange={(e) => setField('paymentFeesPct', e.target.value)}
                      className={NUMBER_INPUT_CLASS}
                    />
                    <span className="shrink-0 text-xs font-medium text-text-3">%</span>
                  </div>
                  <div className="relative shrink-0">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) setField('paymentFeesPct', e.target.value)
                      }}
                      title="Presets de pasarelas"
                      className="cursor-pointer appearance-none rounded-control border border-border bg-surface-2/60 py-2 pl-2.5 pr-6 text-[11px] font-medium text-text-3 outline-none transition-colors duration-200 ease-out hover:border-accent/40 hover:text-accent"
                    >
                      <option value="" disabled>
                        Presets
                      </option>
                      {PAYMENT_FEE_PRESETS.map((preset) => (
                        <option key={preset.label} value={preset.value}>
                          {preset.label} — {preset.value}%
                        </option>
                      ))}
                    </select>
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 10 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-3"
                    >
                      <path d="M2.5 4l2.5 2.5L7.5 4" />
                    </svg>
                  </div>
                </div>
                <span className="text-[10px] text-text-3">Valores de referencia — ajustalo a tu tasa real.</span>
              </label>

              {SIMPLE_FIELD_DEFS.map((field) => (
                <label key={field.key} className="flex flex-col gap-1.5">
                  <FieldLabel text={field.label} tooltip={TOOLTIPS[field.key]} />
                  <div className="flex items-center gap-2 rounded-control border border-border bg-surface-2/60 px-3 py-2 transition-all duration-200 ease-out focus-within:border-accent focus-within:ring-2 focus-within:ring-accent">
                    <input
                      type="number"
                      step={field.step}
                      min={0}
                      value={inputs[field.key] || ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className={NUMBER_INPUT_CLASS}
                    />
                    <span className="shrink-0 text-xs font-medium text-text-3">{field.suffix}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Resultados Estratégicos</p>
            {result.error ? (
              <div className="rounded-control border border-amber/30 bg-amber/[0.06] px-3.5 py-3 text-xs leading-relaxed text-amber">
                {result.error}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <OutputCard
                  label="CPA Punto de Equilibrio"
                  primaryValue={result.breakEvenCpa.toFixed(2)}
                  primarySuffix={moneySymbol}
                  secondaryLine={secondaryConversion(result.breakEvenCpa)}
                  tone="neutral"
                />
                <OutputCard
                  label="ROAS Punto de Equilibrio"
                  primaryValue={result.breakEvenRoas.toFixed(2)}
                  primarySuffix="x"
                  secondaryLine={null}
                  tone="neutral"
                />
                <OutputCard
                  label="CPA Objetivo"
                  primaryValue={result.targetCpa.toFixed(2)}
                  primarySuffix={moneySymbol}
                  secondaryLine={secondaryConversion(result.targetCpa)}
                  tone="accent"
                />
                <OutputCard
                  label="ROAS Objetivo"
                  primaryValue={result.targetRoas.toFixed(2)}
                  primarySuffix="x"
                  secondaryLine={null}
                  tone="accent"
                />
              </div>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-text-3">
              Punto de Equilibrio: el máximo que podés pagar por una compra sin perder plata. Objetivo: lo que necesitás pagar para
              cumplir tu margen de ganancia deseado. ROAS es una relación (ventas/gasto) — no tiene moneda, es igual en {displayCurrency}{' '}
              o en {otherCurrency}.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          {currencyMismatchNoRate ? (
            <p className="text-[11px] text-amber">No hay cotización disponible ahora mismo — cambiá a {accountCurrency} para poder guardar.</p>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-text"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={applying || !!result.error || currencyMismatchNoRate}
              onClick={handleApply}
              className="rounded-control bg-primary px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
