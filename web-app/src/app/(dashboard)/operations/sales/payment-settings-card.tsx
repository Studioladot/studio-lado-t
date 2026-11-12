'use client'

import { useState } from 'react'
import { savePaymentSettingsAction } from './actions'
import {
  describeRates,
  TN_PLAN_LABEL,
  TAX_CONDITION_LABEL,
  type PaymentSettings,
  type TnPlan,
  type ReleaseDays,
  type TaxCondition,
} from '@/lib/tiendanube/payment-fees'

// "Cómo cobrás" (2026-11-12) — reemplaza los % sueltos de "Comisión Tienda
// Nube" y "Comisión Pasarela". La tienda confirma 4-5 datos de su cuenta y
// Gotix calcula sola la comisión de cada orden según cómo se cobró (ver
// lib/tiendanube/payment-fees.ts).

const SELECT_CLASS =
  'w-full rounded-control border border-border bg-surface-2/60 px-2.5 py-1.5 text-xs text-text outline-none transition-all duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent'
const INPUT_CLASS =
  'w-20 rounded-control border border-border bg-surface-2/60 px-2.5 py-1.5 text-right text-xs text-text outline-none transition-all duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent'

const INSTALLMENT_OPTIONS = [2, 3, 6, 9, 12, 18]

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-text">{label}</span>
      {children}
      <span className="text-[11px] leading-relaxed text-text-3">{help}</span>
    </div>
  )
}

function parsePct(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function PaymentSettingsCard({
  initial,
  installmentsSeen,
  installmentsWithoutCost,
  hasOtherGateways,
}: {
  initial: PaymentSettings
  /** Cantidades de cuotas que aparecieron en las órdenes del período. */
  installmentsSeen: number[]
  installmentsWithoutCost: number[]
  hasOtherGateways: boolean
}) {
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<null | 'ok' | 'error'>(null)

  const cuotas = Array.from(new Set([...INSTALLMENT_OPTIONS, ...installmentsSeen, ...Object.keys(values.installmentCosts).map(Number)]))
    .filter((n) => n > 1)
    .sort((a, b) => a - b)
  const rates = describeRates(values)

  function setInstallment(n: number, raw: string) {
    setValues((prev) => {
      const next = { ...prev.installmentCosts }
      const pct = parsePct(raw)
      if (pct === null || pct <= 0) delete next[String(n)]
      else next[String(n)] = pct
      return { ...prev, installmentCosts: next }
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaved(null)
    const result = await savePaymentSettingsAction(values)
    setSaving(false)
    setSaved(result.ok ? 'ok' : 'error')
    if (result.ok) setTimeout(() => setSaved(null), 3000)
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Cómo cobrás</p>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-control bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 ease-out hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      <p className="mb-4 text-[11px] leading-relaxed text-text-2">
        Tienda Nube informa en cada venta cómo te pagaron (transferencia, Pago Nube, tarjeta, cuotas). Con estos datos de tu cuenta, Gotix
        calcula sola lo que te descuenta cada una y cuánto te depositan.
      </p>

      <div className="flex flex-col gap-4">
        <Field
          label="Plan de Tienda Nube"
          help="Lo ves en Tienda Nube > Mi cuenta > Plan. Define cuánto te cobra Tienda Nube por cada venta que no es con Pago Nube (transferencias, efectivo) y las tasas de Pago Nube."
        >
          <select
            className={SELECT_CLASS}
            value={values.tnPlan ?? ''}
            onChange={(e) => setValues((p) => ({ ...p, tnPlan: (e.target.value || null) as TnPlan | null }))}
          >
            <option value="">Elegí tu plan</option>
            {(Object.keys(TN_PLAN_LABEL) as TnPlan[]).map((plan) => (
              <option key={plan} value={plan}>
                {TN_PLAN_LABEL[plan]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="¿En cuántos días te libera Pago Nube la plata?"
          help="Está en Pago Nube > Configurar. Cobrar antes cuesta más: la comisión de tarjeta cambia según este plazo."
        >
          <select
            className={SELECT_CLASS}
            value={values.releaseDays ?? ''}
            onChange={(e) => setValues((p) => ({ ...p, releaseDays: (e.target.value ? Number(e.target.value) : null) as ReleaseDays | null }))}
          >
            <option value="">Elegí el plazo</option>
            <option value="1">1 día</option>
            <option value="7">7 días</option>
            <option value="14">14 días</option>
            <option value="30">30 días</option>
          </select>
        </Field>

        <Field
          label="Situación ante ARCA"
          help="Responsable inscripto o monotributo: a las comisiones se les suma 21% de IVA. No inscripto: Pago Nube retiene 10,5% de cada venta."
        >
          <select
            className={SELECT_CLASS}
            value={values.taxCondition ?? ''}
            onChange={(e) => setValues((p) => ({ ...p, taxCondition: (e.target.value || null) as TaxCondition | null }))}
          >
            <option value="">Elegí tu situación</option>
            {(Object.keys(TAX_CONDITION_LABEL) as TaxCondition[]).map((t) => (
              <option key={t} value={t}>
                {TAX_CONDITION_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-text">Cuotas sin interés</span>
          <span className="text-[11px] leading-relaxed text-text-3">
            Si ofrecés cuotas sin interés, Pago Nube te descuenta un costo extra en cada venta en cuotas, además de la comisión. Copiá el %
            de Pago Nube &gt; Configurar &gt; Cuotas. Dejá vacías las cuotas con interés (esas las paga el cliente).
          </span>
          <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-2">
            {cuotas.map((n) => {
              const missing = installmentsWithoutCost.includes(n)
              return (
                <label key={n} className="flex items-center justify-between gap-2">
                  <span className={`whitespace-nowrap text-xs ${missing ? 'font-semibold text-amber' : 'text-text-2'}`}>
                    {n} cuotas{missing ? ' *' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className={INPUT_CLASS}
                      placeholder="—"
                      value={values.installmentCosts[String(n)] ?? ''}
                      onChange={(e) => setInstallment(n, e.target.value)}
                    />
                    <span className="text-[11px] text-text-3">%</span>
                  </span>
                </label>
              )
            })}
          </div>
          {installmentsWithoutCost.length > 0 && (
            <span className="text-[11px] text-amber">
              * En este período hubo ventas en {installmentsWithoutCost.join(', ')} cuotas sin costo cargado. Si las ofrecés sin interés, cargá
              el % para que se descuente.
            </span>
          )}
        </div>

        <Field
          label="Retenciones de Ingresos Brutos (%)"
          help="SIRTAC o AGIP: Pago Nube las descuenta de cada pago (figuran en el detalle del pago, en Retenciones). No son una comisión: son a cuenta de Ingresos Brutos. Si no te retienen, dejalo vacío."
        >
          <input
            type="number"
            step="any"
            min="0"
            className={INPUT_CLASS}
            placeholder="—"
            value={values.retencionesPct ?? ''}
            onChange={(e) => setValues((p) => ({ ...p, retencionesPct: parsePct(e.target.value) }))}
          />
        </Field>

        {(hasOtherGateways || values.otherGatewayPct !== null) && (
          <Field
            label="Comisión de otra pasarela (Mercado Pago, etc.) (%)"
            help="Para las ventas cobradas por otra pasarela que no es Pago Nube. Lo ves en el detalle de cada cobro de esa pasarela."
          >
            <input
              type="number"
              step="any"
              min="0"
              className={INPUT_CLASS}
              placeholder="—"
              value={values.otherGatewayPct ?? ''}
              onChange={(e) => setValues((p) => ({ ...p, otherGatewayPct: parsePct(e.target.value) }))}
            />
          </Field>
        )}
      </div>

      {rates.length > 0 && (
        <div className="mt-5 rounded-control border border-border bg-surface-2/40 p-3.5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-3">Así se calcula cada venta</p>
          <ul className="flex flex-col gap-1.5">
            {rates.map((r) => (
              <li key={r.medio} className="flex items-start justify-between gap-3 text-[11px]">
                <span className="text-text-2">{r.medio}</span>
                <span className="shrink-0 text-right font-semibold tabular-nums text-text">{r.tasa}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[10px] leading-relaxed text-text-3">
            Tasas oficiales de Tienda Nube y Pago Nube para tu plan, sobre el total de la venta con envío.
          </p>
        </div>
      )}

      {saved === 'ok' && <p className="mt-3 text-[11px] text-green">Guardado. Ya se aplica a todas las ventas, la cascada y cada orden.</p>}
      {saved === 'error' && <p className="mt-3 text-[11px] text-red">No se pudo guardar. Probá de nuevo.</p>}
    </div>
  )
}
