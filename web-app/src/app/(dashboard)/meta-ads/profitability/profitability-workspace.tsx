'use client'

import { useState } from 'react'
import { TargetStat } from '../campaigns/autopilot-panel'
import { UnitEconomicsModal } from '../campaigns/unit-economics-modal'
import {
  updateCampaignTargetAction,
  pauseAllAutopilotAction,
  upsertNotificationSettingsAction,
} from '../campaigns/autopilot-actions'
import type { CampaignTargets, UnitEconomicsInputs, UnitEconomicsResult, NotificationSettings, OrgRunLogEntry } from '@/lib/meta/autopilot'
import { useCurrency } from '@/lib/context/currency-context'
import { convertAmount } from '@/lib/currency'

function AccountControlCard() {
  const [pausing, setPausing] = useState(false)
  const [done, setDone] = useState(false)

  async function handlePauseAll() {
    if (!window.confirm('Esto apaga todos los playbooks prendidos en todas tus campañas. ¿Confirmás?')) return
    setPausing(true)
    const result = await pauseAllAutopilotAction()
    setPausing(false)
    if (result.ok) {
      setDone(true)
      setTimeout(() => setDone(false), 4000)
    }
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-text-3">Control de Autopiloto</p>
      <p className="mb-3 text-xs leading-relaxed text-text-2">
        Un solo botón para apagar todas las automatizaciones prendidas en tu cuenta, sin tener que entrar campaña por campaña.
      </p>
      <button
        type="button"
        disabled={pausing}
        onClick={handlePauseAll}
        className="rounded-control border border-red/30 bg-red/[0.06] px-3 py-1.5 text-[11px] font-semibold text-red transition-all duration-200 ease-out hover:bg-red/[0.12] disabled:opacity-50"
      >
        {pausing ? 'Pausando…' : 'Pausar todo el Autopiloto'}
      </button>
      {done && <p className="mt-2 text-[11px] text-text-2">Listo — todos los playbooks quedaron apagados.</p>}
    </div>
  )
}

function NotificationSettingsCard({ initial }: { initial: NotificationSettings }) {
  const [email, setEmail] = useState(initial.email ?? '')
  const [enabled, setEnabled] = useState(initial.enabled)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const result = await upsertNotificationSettingsAction({ email: email.trim() || null, enabled })
    setSaving(false)
    if (result.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Notificaciones</p>
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-text-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border accent-accent"
          />
          Activas
        </label>
      </div>
      <p className="mb-2.5 text-xs leading-relaxed text-text-2">Un email cada vez que el Autopiloto pausa un anuncio o ajusta un presupuesto.</p>
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="min-w-0 flex-1 rounded-control border border-border bg-surface-2/60 px-3 py-1.5 text-xs text-text outline-none transition-all duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent"
        />
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="shrink-0 rounded-control bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_0_12px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
      {saved && <p className="mt-2 text-[11px] text-text-2">Guardado.</p>}
    </div>
  )
}

function AccountActivityCard({ entries }: { entries: OrgRunLogEntry[] }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Actividad reciente de la cuenta</p>
      {entries.length === 0 ? (
        <p className="rounded-control border border-border bg-surface-2/60 px-3 py-4 text-center text-xs text-text-3">
          Todavía no hay actividad en ninguna campaña.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={`rounded-control border px-3 py-2.5 ${
                entry.action === 'error' ? 'border-red/30 bg-red/[6%]' : 'border-border bg-surface-2/60'
              }`}
            >
              {entry.campaignName && <p className="text-[10px] font-semibold text-text-3">{entry.campaignName}</p>}
              <p className={`mt-0.5 text-xs leading-relaxed ${entry.action === 'error' ? 'text-red' : 'text-text-2'}`}>{entry.message}</p>
              <p className="mt-1 text-[10px] text-text-3">{new Date(entry.createdAt).toLocaleString('es-AR')}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ProfitabilityWorkspace({
  initialTargets,
  initialUnitEconomics,
  initialNotificationSettings,
  initialRunLog,
}: {
  initialTargets: CampaignTargets
  initialUnitEconomics: UnitEconomicsInputs | null
  initialNotificationSettings: NotificationSettings
  initialRunLog: OrgRunLogEntry[]
}) {
  const [targets, setTargets] = useState(initialTargets)
  const [unitEconomics, setUnitEconomics] = useState(initialUnitEconomics)
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { displayCurrency, accountCurrency, usdArsRate } = useCurrency()

  async function applyUnitEconomics(result: UnitEconomicsResult, inputs: UnitEconomicsInputs) {
    setSaving(true)
    // Mismo criterio que autopilot-panel.tsx: la calculadora piensa en
    // displayCurrency, el default de cuenta se guarda en accountCurrency.
    const targetCpa = convertAmount(result.targetCpa, displayCurrency, accountCurrency, usdArsRate)
    const breakEvenCpa = convertAmount(result.breakEvenCpa, displayCurrency, accountCurrency, usdArsRate)

    const saved = await updateCampaignTargetAction({
      campaignId: null,
      targetCpa,
      targetRoas: result.targetRoas,
      breakEvenCpa,
      breakEvenRoas: result.breakEvenRoas,
      unitEconomics: inputs,
    })

    if (saved.ok) {
      setTargets({ targetCpa, targetRoas: result.targetRoas, breakEvenCpa, breakEvenRoas: result.breakEvenRoas })
      setUnitEconomics(inputs)
    }
    setSaving(false)
    setCalculatorOpen(false)
  }

  return (
    <div className="flex max-w-[520px] flex-col gap-4">
      <div className="rounded-card border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Objetivos de cuenta</p>
          <button
            type="button"
            disabled={saving}
            onClick={() => setCalculatorOpen(true)}
            className="rounded-control border border-accent/30 bg-accent/[0.06] px-2.5 py-1 text-[11px] font-semibold text-accent transition-all duration-200 ease-out hover:bg-accent/[0.12] disabled:opacity-50"
          >
            Calcular Rentabilidad
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <TargetStat label="CPA Breakeven" value={targets.breakEvenCpa} unit="money" />
          <TargetStat label="ROAS Breakeven" value={targets.breakEvenRoas} unit="ratio" />
          <TargetStat label="CPA Objetivo" value={targets.targetCpa} unit="money" />
          <TargetStat label="ROAS Objetivo" value={targets.targetRoas} unit="ratio" />
        </div>
      </div>

      <AccountControlCard />
      <NotificationSettingsCard initial={initialNotificationSettings} />
      <AccountActivityCard entries={initialRunLog} />

      <UnitEconomicsModal
        open={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        initialInputs={unitEconomics}
        onApply={applyUnitEconomics}
      />
    </div>
  )
}
