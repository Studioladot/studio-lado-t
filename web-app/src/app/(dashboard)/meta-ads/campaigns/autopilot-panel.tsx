'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AutomationIcon } from '@/components/features/nav-icons'
import { Switch } from './switch'
import {
  PLAYBOOK_DEFS,
  getStrategicStatus,
  type PlaybookType,
  type AutopilotPlaybookSetting,
  type MetaMetricsForStatus,
  type UnitEconomicsResult,
  type UnitEconomicsInputs,
} from '@/lib/meta/autopilot'
import {
  getAutopilotPanelDataAction,
  toggleAutopilotPlaybookAction,
  updateCampaignTargetAction,
  pauseAllAutopilotAction,
  testAutopilotRunAction,
  getCustomRulesAction,
  deleteCustomRuleAction,
  type AutopilotPanelData,
} from './autopilot-actions'
import { UnitEconomicsModal } from './unit-economics-modal'
import { CustomRuleModal } from './custom-rule-modal'
import type { CustomRule } from '@/lib/meta/autopilot'
import { useCurrency } from '@/lib/context/currency-context'
import { convertAmount } from '@/lib/currency'

const STATUS_DOT_CLASS: Record<'escalar' | 'optimizar' | 'kill', string> = {
  escalar: 'bg-green',
  optimizar: 'bg-amber',
  kill: 'bg-red',
}

function PlaybookCard({
  campaignId,
  setting,
  onSaved,
}: {
  campaignId: string
  setting: AutopilotPlaybookSetting
  onSaved: (next: AutopilotPlaybookSetting) => void
}) {
  const def = PLAYBOOK_DEFS[setting.playbookType]
  const [expanded, setExpanded] = useState(false)
  const [params, setParams] = useState<Record<string, number>>(setting.params as Record<string, number>)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(params) !== JSON.stringify(setting.params)

  async function persist(nextEnabled: boolean, nextParams = params) {
    setSaving(true)
    const result = await toggleAutopilotPlaybookAction({
      campaignId,
      playbookType: setting.playbookType,
      enabled: nextEnabled,
      playbookParams: nextParams,
    })
    setSaving(false)
    if (result.ok) onSaved({ playbookType: setting.playbookType, enabled: nextEnabled, params: nextParams } as AutopilotPlaybookSetting)
  }

  return (
    <div className="rounded-control border border-border bg-surface-2/60 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-text">{def.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-text-3">{def.helperText}</p>
        </div>
        <Switch on={setting.enabled} disabled={saving} onClick={() => persist(!setting.enabled)} ariaLabel={`Activar ${def.label}`} />
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-[11px] font-medium text-text-3 transition-colors duration-200 ease-out hover:text-text"
      >
        {expanded ? 'Ocultar parámetros' : 'Ajustar parámetros'}
      </button>

      {expanded && (
        <div className="mt-2.5 flex flex-wrap items-end gap-2.5 border-t border-border pt-2.5">
          {Object.entries(params).map(([key, value]) => (
            <label key={key} className="flex flex-col gap-1 text-[10px] font-medium uppercase tracking-wide text-text-3">
              {PARAM_LABELS[key] ?? key}
              <input
                type="number"
                value={value}
                onChange={(e) => setParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                className="w-24 rounded-control border border-border bg-surface px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-text outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>
          ))}
          {dirty && (
            <button
              type="button"
              disabled={saving}
              onClick={() => persist(setting.enabled)}
              className="rounded-control bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_12px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
            >
              Guardar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const PARAM_LABELS: Record<string, string> = {
  increasePct: 'Subir %',
  intervalDays: 'Cada (días)',
  minConsecutiveDays: 'Días seguidos',
  maxSpendNoAtc: 'Gasto máx. sin ATC ($)',
  ctrDropPct: 'Caída de CTR (%)',
  maxFrequency: 'Frecuencia máx.',
}

// Exportado — lo reutiliza la pantalla de Rentabilidad a nivel cuenta
// (meta-ads/profitability/) para mostrar los mismos 4 valores. `value` viene
// siempre en accountCurrency (así se guarda) — unit:'money' lo convierte a
// displayCurrency para mostrar, igual que cualquier celda monetaria de las
// tablas; unit:'ratio' (ROAS) se muestra tal cual, no tiene moneda.
export function TargetStat({ label, value, unit }: { label: string; value: number; unit: 'money' | 'ratio' }) {
  const { displayCurrency, accountCurrency, usdArsRate } = useCurrency()
  const displayValue = unit === 'money' ? convertAmount(value, accountCurrency, displayCurrency, usdArsRate) : value
  const suffix = unit === 'money' ? (displayCurrency === 'USD' ? 'US$' : '$') : 'x'

  return (
    <div className="rounded-control border border-border bg-surface px-2.5 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-text-3">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-text">
        {displayValue.toFixed(2)}
        <span className="ml-0.5 text-[10px] font-medium text-text-3">{suffix}</span>
      </p>
    </div>
  )
}

export function AutopilotPanel({
  campaignId,
  campaignName,
  metrics,
  onOpenChange,
}: {
  campaignId: string
  campaignName: string
  // Opcional: la lista de Campañas siempre tiene las métricas a mano (ya
  // vienen con la fila); el header del detalle de campaña (MetaCampaignHeader)
  // no las trae — ahí el panel simplemente no muestra el punto de estado.
  metrics?: MetaMetricsForStatus
  // Le avisa a la fila de la tabla que este panel se abrió/cerró, para que
  // pueda resaltarse sutilmente mientras está abierto (ver campaigns-workspace.tsx).
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AutopilotPanelData | null>(null)
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [customRules, setCustomRules] = useState<CustomRule[] | null>(null)
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null)
  // CustomRuleModal siembra sus inputs desde `editingRule` solo en el montaje
  // (useState no vuelve a leer el prop en renders siguientes) — sin este
  // key cambiando en cada apertura, pasar de "Nueva regla" a "Editar" (o
  // reabrir después de cancelar) mostraría el estado stale de la apertura
  // anterior en vez de resetear.
  const [ruleModalKey, setRuleModalKey] = useState(0)
  const [pausingAll, setPausingAll] = useState(false)
  const [testRunning, setTestRunning] = useState(false)
  const [testResult, setTestResult] = useState<{ actions: string[]; message?: string } | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const { displayCurrency, accountCurrency, usdArsRate } = useCurrency()

  function updateOpen(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }

  async function loadCustomRules() {
    const result = await getCustomRulesAction(campaignId)
    if (!('error' in result)) setCustomRules(result)
  }

  async function handleOpen() {
    updateOpen(true)
    setLoading(true)
    setTestResult(null)
    setTestError(null)
    const [result] = await Promise.all([getAutopilotPanelDataAction(campaignId), loadCustomRules()])
    if ('error' in result) {
      setLoading(false)
      return
    }
    setData(result)
    setLoading(false)
  }

  async function handlePauseAll() {
    if (!window.confirm('Esto apaga todos los playbooks prendidos en toda tu cuenta, no solo en esta campaña. ¿Confirmás?')) return
    setPausingAll(true)
    const result = await pauseAllAutopilotAction()
    setPausingAll(false)
    if (result.ok && data) {
      setData({ ...data, playbooks: data.playbooks.map((p) => ({ ...p, enabled: false })) })
    }
  }

  async function handleTestRun() {
    if (
      !window.confirm(
        'Esto corre el Autopiloto de verdad contra esta campaña ahora mismo — puede pausar un anuncio o ajustar un presupuesto si las condiciones se cumplen. ¿Confirmás?'
      )
    )
      return
    setTestRunning(true)
    setTestResult(null)
    setTestError(null)
    const result = await testAutopilotRunAction(campaignId)
    setTestRunning(false)
    if (!result.ok) {
      setTestError(result.error)
      return
    }
    setTestResult({ actions: result.actions, message: result.message })
    // Puede haber pausado/ajustado algo real — refrescamos actividad/targets.
    const refreshed = await getAutopilotPanelDataAction(campaignId)
    if (!('error' in refreshed)) setData(refreshed)
  }

  function openNewRule() {
    setEditingRule(null)
    setRuleModalKey((k) => k + 1)
    setRuleModalOpen(true)
  }

  function openEditRule(rule: CustomRule) {
    setEditingRule(rule)
    setRuleModalKey((k) => k + 1)
    setRuleModalOpen(true)
  }

  async function handleRuleSaved() {
    setRuleModalOpen(false)
    await loadCustomRules()
  }

  async function handleDeleteRule(ruleId: string) {
    if (!window.confirm('¿Borrar esta regla? No se puede deshacer.')) return
    const result = await deleteCustomRuleAction(ruleId, campaignId)
    if (result.ok) await loadCustomRules()
  }

  async function applyUnitEconomics(result: UnitEconomicsResult, inputs: UnitEconomicsInputs) {
    // La calculadora piensa en displayCurrency (la moneda que se está
    // mirando en este momento) — pero el diagnóstico estratégico siempre
    // compara contra el gasto/CPA crudo, que viene de Meta en accountCurrency.
    // Si no se convierte acá antes de guardar, un cálculo hecho en USD con
    // la cuenta en ARS quedaría comparando manzanas con naranjas — mismo
    // motivo por el que getStrategicStatus nunca usa displayCurrency.
    const targetCpa = convertAmount(result.targetCpa, displayCurrency, accountCurrency, usdArsRate)
    const breakEvenCpa = convertAmount(result.breakEvenCpa, displayCurrency, accountCurrency, usdArsRate)

    const saved = await updateCampaignTargetAction({
      campaignId,
      targetCpa,
      targetRoas: result.targetRoas,
      breakEvenCpa,
      breakEvenRoas: result.breakEvenRoas,
      unitEconomics: inputs,
    })
    if (saved.ok && data) {
      setData({
        ...data,
        targets: {
          targetCpa,
          targetRoas: result.targetRoas,
          breakEvenCpa,
          breakEvenRoas: result.breakEvenRoas,
        },
        unitEconomics: inputs ?? null,
      })
    }
    setCalculatorOpen(false)
  }

  const status = data && metrics ? getStrategicStatus(metrics, data.targets) : null

  return (
    <>
      {/* Ícono + palabra, no solo ícono — Gotix se vende a clientes finales,
          no todos van a asociar un rayo con "automatización" a primera
          vista (mismo criterio que "Columnas"/"Lanzar Testeo" en la toolbar,
          que ya combinan ícono y texto). */}
      <button
        type="button"
        onClick={handleOpen}
        title="Automatizar esta campaña"
        className="flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[10px] font-semibold text-text-3 outline-none transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
      >
        <AutomationIcon size={11} />
        Automatizar
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black/60" onClick={() => updateOpen(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-y-0 right-0 z-[101] flex w-[380px] max-w-full flex-col border-l border-border bg-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Automatización</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-text" title={campaignName}>
                    {campaignName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateOpen(false)}
                  className="shrink-0 rounded-md p-1 text-text-3 outline-none transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
                  aria-label="Cerrar"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {loading ? (
                  <div className="flex h-40 items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-2 border-t-accent" />
                  </div>
                ) : !data ? (
                  <p className="text-sm text-text-2">No pudimos cargar la automatización de esta campaña.</p>
                ) : (
                  <>
                    {status && (
                      <div className="mb-4 flex items-center gap-2 rounded-control border border-border bg-surface-2/60 px-3 py-2.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[status.label]}`} />
                        <p className="text-xs leading-relaxed text-text-2">{status.reason}</p>
                      </div>
                    )}

                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Playbooks</p>
                      <button
                        type="button"
                        disabled={pausingAll}
                        onClick={handlePauseAll}
                        title="Apaga todos los playbooks prendidos en toda la cuenta, no solo acá"
                        className="text-[10px] font-semibold text-red/80 transition-colors duration-200 ease-out hover:text-red disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Pausar todo el Autopiloto
                      </button>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {data.playbooks.map((setting) => (
                        <PlaybookCard
                          key={setting.playbookType}
                          campaignId={campaignId}
                          setting={setting}
                          onSaved={(next) =>
                            setData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    playbooks: prev.playbooks.map((p) => (p.playbookType === next.playbookType ? next : p)),
                                  }
                                : prev
                            )
                          }
                        />
                      ))}
                    </div>

                    <div className="mt-3 rounded-control border border-border bg-surface-2/60 p-3">
                      <button
                        type="button"
                        disabled={testRunning}
                        onClick={handleTestRun}
                        className="text-[11px] font-semibold text-accent transition-colors duration-200 ease-out hover:text-accent/80 disabled:opacity-50"
                      >
                        {testRunning ? 'Corriendo…' : 'Probar Autopiloto ahora'}
                      </button>
                      <p className="mt-1 text-[10px] leading-relaxed text-text-3">
                        Corre de verdad contra esta campaña — puede pausar un anuncio o ajustar un presupuesto si algo cumple las condiciones.
                      </p>
                      {testError && <p className="mt-2 text-[11px] text-red">{testError}</p>}
                      {testResult && (
                        <div className="mt-2">
                          {testResult.actions.length === 0 ? (
                            <p className="text-[11px] text-text-2">{testResult.message ?? 'Nada que hacer por ahora.'}</p>
                          ) : (
                            <ul className="flex flex-col gap-1">
                              {testResult.actions.map((msg, i) => (
                                <li key={i} className="text-[11px] leading-relaxed text-text-2">
                                  · {msg}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mb-2 mt-5 flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Objetivos de esta campaña</p>
                      <button
                        type="button"
                        onClick={() => setCalculatorOpen(true)}
                        className="rounded-control border border-accent/30 bg-accent/[0.06] px-2.5 py-1 text-[11px] font-semibold text-accent transition-all duration-200 ease-out hover:bg-accent/[0.12]"
                      >
                        Calcular Rentabilidad
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <TargetStat label="CPA Breakeven" value={data.targets.breakEvenCpa} unit="money" />
                      <TargetStat label="ROAS Breakeven" value={data.targets.breakEvenRoas} unit="ratio" />
                      <TargetStat label="CPA Objetivo" value={data.targets.targetCpa} unit="money" />
                      <TargetStat label="ROAS Objetivo" value={data.targets.targetRoas} unit="ratio" />
                    </div>

                    <p className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-wide text-text-3">Actividad reciente</p>
                    {data.runLog.length === 0 ? (
                      <p className="rounded-control border border-border bg-surface-2/60 px-3 py-4 text-center text-xs text-text-3">
                        Todavía no hay actividad — el sistema corre cada hora y solo actúa sobre playbooks prendidos.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {data.runLog.map((entry) => (
                          <li
                            key={entry.id}
                            className={`rounded-control border px-3 py-2.5 ${
                              entry.action === 'error' ? 'border-red/30 bg-red/[6%]' : 'border-border bg-surface-2/60'
                            }`}
                          >
                            <p className={`text-xs leading-relaxed ${entry.action === 'error' ? 'text-red' : 'text-text-2'}`}>{entry.message}</p>
                            <p className="mt-1 text-[10px] text-text-3">{new Date(entry.createdAt).toLocaleString('es-AR')}</p>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-5 border-t border-border pt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Avanzado — reglas personalizadas</p>
                        <button
                          type="button"
                          onClick={openNewRule}
                          className="text-[11px] font-semibold text-accent transition-colors duration-200 ease-out hover:text-accent/80"
                        >
                          + Nueva regla
                        </button>
                      </div>
                      {!customRules || customRules.length === 0 ? (
                        <p className="rounded-control border border-border bg-surface-2/60 px-3 py-4 text-center text-xs text-text-3">
                          Sin reglas todavía — armá condiciones propias si los playbooks no te alcanzan.
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {customRules.map((rule) => (
                            <li
                              key={rule.id}
                              className="flex items-center justify-between gap-2 rounded-control border border-border bg-surface-2/60 px-3 py-2.5"
                            >
                              <div className="min-w-0">
                                <p className={`truncate text-xs font-semibold ${rule.active ? 'text-text' : 'text-text-3'}`}>{rule.name}</p>
                                <p className="mt-0.5 text-[10px] text-text-3">{rule.active ? 'Activa' : 'Inactiva'}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditRule(rule)}
                                  className="rounded-md px-1.5 py-1 text-[10px] font-medium text-text-3 outline-none transition-colors duration-200 ease-out hover:bg-surface hover:text-accent"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRule(rule.id)}
                                  className="rounded-md px-1.5 py-1 text-[10px] font-medium text-text-3 outline-none transition-colors duration-200 ease-out hover:bg-surface hover:text-red"
                                >
                                  Borrar
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {data && (
        <UnitEconomicsModal
          open={calculatorOpen}
          onClose={() => setCalculatorOpen(false)}
          initialInputs={data.unitEconomics}
          onApply={applyUnitEconomics}
        />
      )}

      <CustomRuleModal
        key={ruleModalKey}
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        campaignId={campaignId}
        editingRule={editingRule}
        onSaved={handleRuleSaved}
      />
    </>
  )
}

export type { PlaybookType }
