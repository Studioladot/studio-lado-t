'use client'

import { createPortal } from 'react-dom'
import { useState } from 'react'
import { AP_METRICS, type CustomRule, type RuleAction, type RuleCondition, type RuleOperator } from '@/lib/meta/autopilot'
import { upsertCustomRuleAction } from './autopilot-actions'

// Modo Avanzado — mismo motor conceptual que los playbooks (autopilot.ts),
// pero condiciones libres armadas a mano en vez de un preset fijo. Mismo
// patrón de modal centrado por portal que unit-economics-modal.tsx.

const OPERATOR_LABELS: Record<RuleOperator, string> = { lt: 'menor a', gt: 'mayor a', eq: 'igual a' }

const ACTION_DEFS: { value: RuleAction; label: string }[] = [
  { value: 'pause', label: 'Pausar el anuncio' },
  { value: 'notify', label: 'Solo avisar (no pausa nada)' },
  { value: 'increase_budget', label: 'Subir presupuesto del conjunto' },
  { value: 'reduce_budget', label: 'Bajar presupuesto del conjunto' },
]

const METRIC_OPTIONS = Object.entries(AP_METRICS).map(([key, def]) => ({ key, label: def.label }))

function emptyCondition(): RuleCondition {
  return { metric: 'roas', operator: 'lt', value: 0 }
}

const FIELD_CLASS =
  'rounded-control border border-border bg-surface-2/60 px-3 py-2 text-sm text-text outline-none transition-all duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent'

export function CustomRuleModal({
  open,
  onClose,
  campaignId,
  editingRule,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  campaignId: string
  editingRule: CustomRule | null
  onSaved: () => void
}) {
  const [name, setName] = useState(editingRule?.name ?? '')
  const [conditions, setConditions] = useState<RuleCondition[]>(
    editingRule?.conditions.length ? editingRule.conditions : [emptyCondition()]
  )
  const [windowDays, setWindowDays] = useState(editingRule?.windowDays ?? 7)
  const [minSpend, setMinSpend] = useState(editingRule?.minSpend ?? 0)
  const [action, setAction] = useState<RuleAction>(editingRule?.action ?? 'pause')
  const [budgetChangePct, setBudgetChangePct] = useState(editingRule?.params.budgetChangePct ?? 20)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const needsBudgetPct = action === 'increase_budget' || action === 'reduce_budget'

  function updateCondition(index: number, patch: Partial<RuleCondition>) {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }
  function addCondition() {
    setConditions((prev) => [...prev, emptyCondition()])
  }
  function removeCondition(index: number) {
    setConditions((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setError(null)
    if (!name.trim()) {
      setError('Ponele un nombre a la regla.')
      return
    }
    setSaving(true)
    const result = await upsertCustomRuleAction({
      id: editingRule?.id,
      campaignId,
      name,
      conditions,
      windowDays,
      minSpend,
      action,
      ruleParams: needsBudgetPct ? { budgetChangePct } : {},
      active: editingRule?.active ?? true,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error ?? 'No se pudo guardar la regla.')
      return
    }
    onSaved()
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-[520px] max-w-full flex-col rounded-card border border-border bg-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Modo Avanzado</p>
            <h2 className="mt-0.5 text-[17px] font-bold tracking-[-0.02em] text-text">
              {editingRule ? 'Editar regla' : 'Nueva regla personalizada'}
            </h2>
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

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-2">Nombre</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Pausar si el CPA se dispara"
                className={FIELD_CLASS}
              />
            </label>

            <div>
              <p className="mb-2 text-xs font-medium text-text-2">Condiciones — se cumplen todas a la vez</p>
              <div className="flex flex-col gap-2">
                {conditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <select
                      value={c.metric}
                      onChange={(e) => updateCondition(i, { metric: e.target.value })}
                      className="min-w-0 flex-1 rounded-control border border-border bg-surface-2/60 px-2 py-1.5 text-xs text-text outline-none transition-colors duration-200 ease-out focus:border-accent"
                    >
                      {METRIC_OPTIONS.map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={c.operator}
                      onChange={(e) => updateCondition(i, { operator: e.target.value as RuleOperator })}
                      className="shrink-0 rounded-control border border-border bg-surface-2/60 px-2 py-1.5 text-xs text-text outline-none transition-colors duration-200 ease-out focus:border-accent"
                    >
                      {(Object.keys(OPERATOR_LABELS) as RuleOperator[]).map((op) => (
                        <option key={op} value={op}>
                          {OPERATOR_LABELS[op]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={c.value}
                      onChange={(e) => updateCondition(i, { value: Number(e.target.value) })}
                      className="w-20 shrink-0 rounded-control border border-border bg-surface-2/60 px-2 py-1.5 text-xs text-text outline-none transition-colors duration-200 ease-out focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => removeCondition(i)}
                      disabled={conditions.length === 1}
                      className="shrink-0 rounded-md p-1.5 text-text-3 outline-none transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-red disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Quitar condición"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addCondition}
                className="mt-2 text-[11px] font-medium text-accent transition-colors duration-200 ease-out hover:text-accent/80"
              >
                + Agregar condición
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-text-2">Ventana de análisis (días)</span>
                <input
                  type="number"
                  min={1}
                  value={windowDays}
                  onChange={(e) => setWindowDays(Number(e.target.value))}
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-text-2">Gasto mínimo para evaluar</span>
                <input
                  type="number"
                  min={0}
                  value={minSpend}
                  onChange={(e) => setMinSpend(Number(e.target.value))}
                  className={FIELD_CLASS}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-2">Acción</span>
              <select value={action} onChange={(e) => setAction(e.target.value as RuleAction)} className={FIELD_CLASS}>
                {ACTION_DEFS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>

            {needsBudgetPct && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-text-2">% de cambio de presupuesto</span>
                <div className="flex items-center gap-2 rounded-control border border-border bg-surface-2/60 px-3 py-2 transition-all duration-200 ease-out focus-within:border-accent focus-within:ring-2 focus-within:ring-accent">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={budgetChangePct}
                    onChange={(e) => setBudgetChangePct(Number(e.target.value))}
                    className="w-full bg-transparent text-sm text-text outline-none"
                  />
                  <span className="shrink-0 text-xs font-medium text-text-3">%</span>
                </div>
              </label>
            )}

            {error && <p className="text-xs text-red">{error}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-text"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-control bg-primary px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
          >
            {editingRule ? 'Guardar cambios' : 'Crear regla'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
