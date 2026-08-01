'use client'

import { useState, type FormEvent } from 'react'
import { addOperatingCostAction, deleteOperatingCostAction } from './actions'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import type { OperatingCost } from '@/lib/tiendanube/operating-costs'

// Costos Fijos Mensuales (OpEx) — reemplaza an_costos_adicionales del
// legado (app.html:12684-12694), nunca migrada. Lista libre: Alquiler,
// Sueldos, Suscripciones, etc. — cada ítem es una fila independiente, sin
// upsert por concepto. El total se prorratea por período en page.tsx y se
// resta en la Cascada y en la Radiografía de la Orden.

const FIELD_CLASS =
  'rounded-control border border-border bg-surface-2/60 px-3 py-2 text-sm text-text outline-none transition-all duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent'

function money(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

export function OperatingCostsCard({ costs }: { costs: OperatingCost[] }) {
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = costs.reduce((sum, c) => sum + c.monto, 0)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!concepto.trim() || !monto) return

    setSaving(true)
    const result = await addOperatingCostAction({ concepto: concepto.trim(), monto: Number(monto) || 0 })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setConcepto('')
    setMonto('')
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-0.5 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Costos Fijos Mensuales</p>
        <p className="text-xs font-semibold tabular-nums text-text">{money(total)}/mes</p>
      </div>
      <p className="mb-3 text-[11px] text-text-3">
        Alquiler, sueldos, suscripciones — se prorratea por período y se resta en la Cascada de Rentabilidad y en la Radiografía de cada
        orden.
      </p>

      <form onSubmit={handleSubmit} className="mb-3 flex flex-wrap items-end gap-2.5">
        <label className="flex min-w-[160px] flex-1 flex-col gap-1.5 text-xs font-medium text-text-2">
          Concepto
          <input
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej: Alquiler"
            className={FIELD_CLASS}
          />
        </label>
        <label className="flex w-[140px] flex-col gap-1.5 text-xs font-medium text-text-2">
          Monto mensual
          <input type="number" min={0} step="any" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" className={FIELD_CLASS} />
        </label>
        <button
          type="submit"
          disabled={saving || !concepto.trim() || !monto}
          className="rounded-control bg-primary px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Agregar'}
        </button>
      </form>
      {error && <p className="mb-2 text-xs text-red">{error}</p>}

      {costs.length === 0 ? (
        <p className="text-center text-xs text-text-3">Sin costos fijos cargados todavía.</p>
      ) : (
        <ul className="flex max-h-[220px] flex-col gap-1.5 overflow-y-auto">
          {costs.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-control border border-border bg-surface-2/60 px-3 py-2"
            >
              <p className="min-w-0 flex-1 truncate text-xs font-medium text-text">{c.concepto}</p>
              <div className="flex shrink-0 items-center gap-3">
                <p className="text-xs font-semibold tabular-nums text-text">{money(c.monto)}</p>
                <form action={deleteOperatingCostAction.bind(null, c.id)}>
                  <ConfirmSubmitButton
                    confirmMessage={`¿Borrar "${c.concepto}"?`}
                    className="text-[11px] font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                  >
                    Borrar
                  </ConfirmSubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
