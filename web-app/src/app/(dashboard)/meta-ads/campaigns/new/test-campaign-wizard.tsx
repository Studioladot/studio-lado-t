'use client'

import { useActionState, useEffect, useState, type FormEvent } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { launchTestCampaignAction, type LaunchTestCampaignState } from '../actions'
import type { MetaPixel, MetaPage, MetaAudience, MetaExistingPost } from '@/lib/meta/ad-launch'
import type { LibraryCreative } from '@/lib/meta/library'
import type { InstagramPostOption } from './data-actions'
import { ADV_CONTROLS, ADV_CONTROLS_DEFAULT, type AdvControlKey, type AdvControls } from '@/lib/meta/ad-launch'
import { AdSetEditor } from './adset-editor'
import { PresetsMenu } from './presets-menu'
import type { WizardPreset } from '@/lib/wizard-presets'
import { STATUS_LABEL } from '../status'
import { fieldClass, labelClass } from './wizard-styles'
import { useCurrency } from '@/lib/context/currency-context'
import { formatMoney } from '@/lib/currency'
import { PillarField } from '@/components/features/pillar-field'
import type { ContentPillar } from '@/lib/pillars'

type ScriptOption = { id: string; title: string | null; hook: string | null; body: string | null; copy_feed: string | null }

const initialState: LaunchTestCampaignState = { error: null, steps: [], campaignId: null }
// Mismo umbral que META_HIGH_SPEND_CONFIRM del legacy (app.html:10601) y que
// CampaignStatusToggle ya usa para pausar — acá pide confirmación antes de
// lanzar con un presupuesto diario alto. El número es un umbral crudo, no
// una plata en sí — se muestra formateado en la moneda real de la cuenta
// (bug de auditoría 2026-07-24: antes decía "USD" sin importar que la
// cuenta conectada estuviera en ARS).
const HIGH_BUDGET_CONFIRM_THRESHOLD = 200

const OBJECTIVES = [
  { value: 'OUTCOME_SALES', label: 'Ventas', needsPixel: true },
  { value: 'OUTCOME_LEADS', label: 'Clientes potenciales', needsPixel: true },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Interacción', needsPixel: false },
  { value: 'OUTCOME_TRAFFIC', label: 'Tráfico', needsPixel: false },
  { value: 'OUTCOME_AWARENESS', label: 'Reconocimiento de marca', needsPixel: false },
]

const BID_STRATEGIES = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Costo Mínimo', sub: 'Meta busca el mejor resultado posible con tu presupuesto — recomendado.' },
  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Tope de Puja', sub: 'Fijás el máximo que pagás por puja individual.' },
  { value: 'COST_CAP', label: 'Tope de Costo', sub: 'Fijás el costo promedio por resultado que estás dispuesto a pagar.' },
]

const STEPS = [
  { id: 1, label: 'Datos', sub: 'Nombre, producto y objetivo' },
  { id: 2, label: 'Cronograma', sub: 'Cuándo arranca' },
  { id: 3, label: 'Presupuesto', sub: 'Plata y estrategia de puja' },
  { id: 4, label: 'Ad Set y Anuncio', sub: 'Audiencia, ubicación y creativo' },
] as const

function SubmitButton({ addingToExisting }: { addingToExisting: boolean }) {
  const { pending } = useFormStatus()
  const idleLabel = addingToExisting ? 'Agregar a la campaña' : 'Generar Testeo'
  const pendingLabel = addingToExisting ? 'Agregando…' : 'Generando…'
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-[20px] bg-primary px-6 py-[11px] text-sm font-semibold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  )
}

export function TestCampaignWizard({
  pixels,
  pages,
  audiences,
  existingPosts,
  existingCampaigns,
  scripts,
  libraryCreatives,
  instagramPosts,
  igActorId,
  pillars,
  onClose,
}: {
  pixels: MetaPixel[]
  pages: MetaPage[]
  audiences: MetaAudience[]
  existingPosts: MetaExistingPost[]
  existingCampaigns: { id: string; name: string; status: string }[]
  scripts: ScriptOption[]
  libraryCreatives: LibraryCreative[]
  instagramPosts: InstagramPostOption[]
  igActorId: string | null
  pillars: ContentPillar[]
  onClose: () => void
}) {
  const { accountCurrency } = useCurrency()
  const [state, formAction] = useActionState(launchTestCampaignAction, initialState)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  const [name, setName] = useState('')
  const [productUrl, setProductUrl] = useState('')
  const [objective, setObjective] = useState('OUTCOME_SALES')
  const [campaignMode, setCampaignModeState] = useState<'new' | 'existing'>('new')
  const [existingCampaignId, setExistingCampaignId] = useState('')
  const [budgetMode, setBudgetMode] = useState<'cbo' | 'abo'>('abo')
  const [dailyBudgetInput, setDailyBudgetInput] = useState('')
  const [bidStrategy, setBidStrategy] = useState('LOWEST_COST_WITHOUT_CAP')
  const [bidAmount, setBidAmount] = useState('')
  const [placementsMode, setPlacementsMode] = useState<'automatic' | 'manual'>('automatic')
  const [pixelId, setPixelId] = useState(pixels[0]?.id ?? '')
  const [pageId, setPageId] = useState(pages[0]?.id ?? '')
  const [adSetIds, setAdSetIds] = useState<number[]>([0])
  const [nextAdSetId, setNextAdSetId] = useState(1)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [advControls, setAdvControls] = useState<AdvControls>(ADV_CONTROLS_DEFAULT)
  const [advDetailOpen, setAdvDetailOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const advKeys = Object.keys(ADV_CONTROLS) as AdvControlKey[]
  const advOffCount = advKeys.filter((key) => !advControls[key]).length
  const advAllOff = advOffCount === advKeys.length

  function toggleAdvMaster() {
    const next = Object.fromEntries(advKeys.map((key) => [key, advAllOff])) as AdvControls
    setAdvControls(next)
  }

  function toggleAdvControl(key: AdvControlKey) {
    setAdvControls((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function getCurrentConfig(): Omit<WizardPreset, 'id' | 'name' | 'createdAt'> {
    return { objective, budgetMode, dailyBudget: dailyBudgetNum, bidStrategy, bidAmount, placementsMode, pixelId, pageId, productUrl }
  }

  function applyPreset(preset: WizardPreset) {
    setObjective(preset.objective)
    setBudgetMode(preset.budgetMode)
    setDailyBudgetInput(preset.dailyBudget ? String(preset.dailyBudget) : '')
    setBidStrategy(preset.bidStrategy)
    setBidAmount(preset.bidAmount || '')
    setPlacementsMode(preset.placementsMode)
    if (preset.pixelId) setPixelId(preset.pixelId)
    if (preset.pageId) setPageId(preset.pageId)
    setProductUrl(preset.productUrl || '')
  }

  const objectiveDef = OBJECTIVES.find((o) => o.value === objective) ?? OBJECTIVES[0]
  const selectedExistingCampaign = existingCampaigns.find((c) => c.id === existingCampaignId) ?? null
  const addingToExisting = campaignMode === 'existing'
  const dailyBudgetNum = Number(dailyBudgetInput) || 0
  const budgetHintLow = Math.max(1, Math.round(dailyBudgetNum * 0.8))
  const budgetHintHigh = Math.round(dailyBudgetNum * 1.3)
  const perAdSetBudget = adSetIds.length > 0 ? dailyBudgetNum / adSetIds.length : dailyBudgetNum

  // Los pasos 1-3 quedan con display:none cuando el usuario está en el paso 4
  // (donde vive el botón de submit) — un input con `required` en un elemento
  // no renderizado no bloquea el submit nativo del navegador, así que hay que
  // validar esto a mano antes de dejar pasar el envío.
  function getFirstInvalidStep(): { step: 1 | 3; message: string } | null {
    if (!name.trim()) return { step: 1, message: 'Falta el nombre de la campaña.' }
    if (campaignMode === 'existing' && !existingCampaignId) {
      return { step: 1, message: 'Elegí qué campaña existente vas a usar.' }
    }
    if (!dailyBudgetInput || dailyBudgetNum <= 0) return { step: 3, message: 'Falta el presupuesto diario.' }
    return null
  }

  const firstInvalid = attemptedSubmit ? getFirstInvalidStep() : null

  function addAdSet() {
    setAdSetIds((prev) => [...prev, nextAdSetId])
    setNextAdSetId((n) => n + 1)
  }

  function removeAdSet(id: number) {
    setAdSetIds((prev) => prev.filter((x) => x !== id))
  }

  // CBO fija el presupuesto en la campaña al crearla — no aplica cuando se
  // suma a una que ya existe, ahí cada conjunto siempre lleva su propio
  // presupuesto (ABO).
  function setCampaignMode(mode: 'new' | 'existing') {
    setCampaignModeState(mode)
    if (mode === 'existing') setBudgetMode('abo')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setAttemptedSubmit(true)
    const invalid = getFirstInvalidStep()
    if (invalid) {
      event.preventDefault()
      setStep(invalid.step)
      return
    }

    // Cada duplicado de un conjunto gasta el mismo monto que su original —
    // el gasto diario máximo real no es el número que se tipeó, es ese
    // número multiplicado por la cantidad total de copias que se van a crear.
    const form = event.currentTarget
    let totalCopies = 0
    for (let i = 0; i < adSetIds.length; i++) {
      const input = form.elements.namedItem(`adset_duplicates_${i}`) as HTMLInputElement | null
      totalCopies += input ? Math.max(1, Math.min(10, Number(input.value) || 1)) : 1
    }
    const maxDailySpend = budgetMode === 'abo' ? perAdSetBudget * totalCopies : dailyBudgetNum

    if (maxDailySpend >= HIGH_BUDGET_CONFIRM_THRESHOLD) {
      const confirmed = window.confirm(
        totalCopies > adSetIds.length
          ? `Con los duplicados, el gasto diario máximo posible es ${formatMoney(maxDailySpend, accountCurrency)} (no ${formatMoney(dailyBudgetNum, accountCurrency)}). ¿Confirmás?`
          : `Vas a lanzar con ${formatMoney(maxDailySpend, accountCurrency)} de presupuesto diario — es un monto alto. ¿Confirmás?`
      )
      if (!confirmed) event.preventDefault()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[86vh] max-h-[840px] w-[1120px] max-w-full overflow-hidden rounded-card border border-border bg-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]"
      >
        <form
          action={formAction}
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            // Enter en un input de un paso anterior no debería mandar el form
            // entero — solo el botón "Generar Testeo" del paso 4 dispara el submit.
            if (event.key === 'Enter' && step < 4 && (event.target as HTMLElement).tagName !== 'TEXTAREA') {
              event.preventDefault()
            }
          }}
          className="flex min-h-0 w-full"
        >
          {/* Sidebar: stepper + resumen */}
          <div className="flex w-[220px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-4">
            <div className="flex flex-col gap-1">
              {STEPS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-current={step === s.id ? 'step' : undefined}
                  onClick={() => setStep(s.id)}
                  className={`flex items-center gap-2.5 rounded-md p-2 text-left outline-none transition-colors duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent ${
                    step === s.id ? 'bg-accent/[0.08]' : 'hover:bg-surface-2'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      step >= s.id ? 'bg-primary text-white' : 'bg-surface-2 text-text-3'
                    }`}
                  >
                    {s.id}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-[13px] font-semibold ${step === s.id ? 'text-text' : 'text-text-2'}`}>
                      {s.label}
                    </span>
                    <span className="block truncate text-[11px] text-text-3">{s.sub}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-auto rounded-control border border-border bg-surface-2/50 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-text-3">Resumen</p>
              {addingToExisting ? (
                <>
                  <p className="inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                    Campaña existente
                  </p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-text">
                    {selectedExistingCampaign ? selectedExistingCampaign.name : 'Elegí una campaña'}
                  </p>
                </>
              ) : (
                <p className="truncate text-sm font-semibold text-text">{name || 'Campaña sin nombre'}</p>
              )}
              <p className="mt-0.5 text-xs text-text-2">
                {dailyBudgetNum > 0 ? `${formatMoney(dailyBudgetNum, accountCurrency)}/día` : 'Sin presupuesto todavía'}
              </p>
              <p className="mt-0.5 text-xs text-text-3">{objectiveDef.label}</p>
            </div>
          </div>

          {/* Columna principal */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-text">Lanzar Testeo</h2>
                <p className="text-xs text-text-2">Configurá la campaña y agregá tantos conjuntos y anuncios como necesites.</p>
              </div>
              <div className="flex items-center gap-3">
                <PresetsMenu getCurrentConfig={getCurrentConfig} onApply={applyPreset} />
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-3 transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {firstInvalid && (
                <div className="mb-5 rounded-control border border-amber/30 bg-amber/[8%] px-4 py-3 text-sm text-amber">
                  {firstInvalid.message}
                </div>
              )}

              {state.error && (
                <div className="mb-5 rounded-control border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">
                  <p>{state.error}</p>
                  {state.steps.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 text-xs">
                      {state.steps.map((s) => (
                        <li key={s.label} className={s.ok ? 'text-green' : 'text-red'}>
                          {s.ok ? '✓' : '✗'} {s.label}
                          {s.detail ? ` — ${s.detail}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                  {state.campaignId && (
                    <p className="mt-3">
                      <Link href={`/meta-ads/campaigns/${state.campaignId}`} className="font-semibold text-accent hover:text-primary-hover">
                        Ver lo que sí se creó →
                      </Link>
                    </p>
                  )}
                </div>
              )}

              {/* PASO 1 — Datos */}
              <div className={step === 1 ? 'flex flex-col gap-4' : 'hidden'}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="name" className={labelClass}>
                      Nombre de la campaña
                    </label>
                    {/* Sin `required`: en un input display:none (otro paso activo) el
                        navegador bloquea el submit sin feedback visible — se valida
                        a mano en getFirstInvalidStep(). */}
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Test hook — remeras oversize"
                      className={fieldClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="objective" className={labelClass}>
                      Objetivo
                    </label>
                    <select id="objective" name="objective" value={objective} onChange={(e) => setObjective(e.target.value)} className={fieldClass}>
                      {OBJECTIVES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <PillarField pillars={pillars} defaultValue="" />

                {existingCampaigns.length > 0 && (
                  <div>
                    <p className={`mb-1.5 ${labelClass}`}>Campaña</p>
                    <div className="inline-flex rounded-control border border-border p-0.5">
                      <button
                        type="button"
                        aria-pressed={campaignMode === 'new'}
                        onClick={() => setCampaignMode('new')}
                        className={`rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
                          campaignMode === 'new' ? 'bg-primary text-white' : 'text-text-2 hover:text-text'
                        }`}
                      >
                        Campaña nueva
                      </button>
                      <button
                        type="button"
                        aria-pressed={campaignMode === 'existing'}
                        onClick={() => setCampaignMode('existing')}
                        className={`rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
                          campaignMode === 'existing' ? 'bg-primary text-white' : 'text-text-2 hover:text-text'
                        }`}
                      >
                        Sumar a una existente
                      </button>
                    </div>
                    <input type="hidden" name="campaign_mode" value={campaignMode} />
                  </div>
                )}

                {campaignMode === 'existing' && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="existing_campaign_id" className={labelClass}>
                      Campaña existente
                    </label>
                    <select
                      id="existing_campaign_id"
                      name="existing_campaign_id"
                      value={existingCampaignId}
                      onChange={(e) => setExistingCampaignId(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">Elegí una campaña</option>
                      {existingCampaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {STATUS_LABEL[c.status] ?? c.status}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-start gap-2.5 rounded-control border border-accent/30 bg-accent/[0.06] px-3.5 py-3">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="mt-0.5 shrink-0 text-accent"
                      >
                        <circle cx="8" cy="8" r="6.5" />
                        <path d="M8 7.25v3.5" strokeLinecap="round" />
                        <circle cx="8" cy="5.25" r="0.75" fill="currentColor" stroke="none" />
                      </svg>
                      <p className="text-xs leading-relaxed text-text">
                        Los conjuntos y anuncios que armes acá se van a agregar dentro de{' '}
                        <span className="font-bold">{selectedExistingCampaign ? `"${selectedExistingCampaign.name}"` : 'la campaña elegida'}</span>.
                        {' '}
                        <span className="font-semibold">No se crea una campaña nueva ni se duplica la existente</span> — es la misma
                        campaña, con más conjuntos adentro.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="product_url" className={labelClass}>
                    URL del producto
                  </label>
                  <input
                    id="product_url"
                    name="product_url"
                    type="url"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://tutienda.com/producto"
                    className={fieldClass}
                  />
                  <p className="text-xs text-text-3">Se usa como link de destino del anuncio si no cargás uno distinto en el paso 4.</p>
                </div>
              </div>

              {/* PASO 2 — Cronograma */}
              <div className={step === 2 ? 'flex flex-col gap-4' : 'hidden'}>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="schedule_datetime" className={labelClass}>
                    Fecha y hora de inicio (opcional)
                  </label>
                  <input id="schedule_datetime" name="schedule_datetime" type="datetime-local" className={fieldClass} />
                  <p className="text-xs text-text-3">Dejalo vacío para no programar nada todavía.</p>
                </div>
                <label className="flex items-center justify-between gap-3 rounded-control border border-border px-4 py-3">
                  <span>
                    <span className="block text-sm font-medium text-text">Publicar activa</span>
                    <span className="block text-xs text-text-3">Si lo dejás apagado, se crea pausada hasta que la actives vos.</span>
                  </span>
                  <input type="checkbox" name="publish_active" value="1" className="h-4 w-4 shrink-0 accent-accent" />
                </label>
              </div>

              {/* PASO 3 — Presupuesto */}
              <div className={step === 3 ? 'flex flex-col gap-5' : 'hidden'}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="daily_budget" className={labelClass}>
                      Presupuesto diario ({accountCurrency})
                    </label>
                    {/* Sin `required` — mismo motivo que el campo "name" en el paso 1. */}
                    <input
                      id="daily_budget"
                      name="daily_budget"
                      type="number"
                      min={1}
                      step={1}
                      value={dailyBudgetInput}
                      onChange={(e) => setDailyBudgetInput(e.target.value)}
                      placeholder="Ej: 20"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <p className={`mb-1.5 ${labelClass}`}>Presupuesto</p>
                    {campaignMode === 'existing' ? (
                      <p className="text-xs text-text-3">Cada conjunto lleva su propio presupuesto (ABO).</p>
                    ) : (
                      <div className="inline-flex rounded-control border border-border p-0.5">
                        <button
                          type="button"
                          aria-pressed={budgetMode === 'abo'}
                          onClick={() => setBudgetMode('abo')}
                          className={`rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
                            budgetMode === 'abo' ? 'bg-primary text-white' : 'text-text-2 hover:text-text'
                          }`}
                        >
                          ABO
                        </button>
                        <button
                          type="button"
                          aria-pressed={budgetMode === 'cbo'}
                          onClick={() => setBudgetMode('cbo')}
                          className={`rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
                            budgetMode === 'cbo' ? 'bg-primary text-white' : 'text-text-2 hover:text-text'
                          }`}
                        >
                          CBO
                        </button>
                      </div>
                    )}
                    <input type="hidden" name="budget_mode" value={budgetMode} />
                  </div>
                </div>
                {dailyBudgetNum > 0 && (
                  <p className="-mt-3 text-xs text-text-3">
                    Recomendado para empezar a ver datos confiables: {formatMoney(budgetHintLow, accountCurrency)}–
                    {formatMoney(budgetHintHigh, accountCurrency)}/día
                    {budgetMode === 'abo' && adSetIds.length > 1 && (
                      <>
                        {' '}
                        · Se reparte en partes iguales entre los {adSetIds.length} conjuntos — {formatMoney(perAdSetBudget, accountCurrency)}/día cada
                        uno.
                      </>
                    )}
                  </p>
                )}

                <div>
                  <p className={`mb-2 ${labelClass}`}>Estrategia de puja</p>
                  <div className="flex flex-col gap-2">
                    {BID_STRATEGIES.map((b) => (
                      <label
                        key={b.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-control border px-4 py-3 transition-colors duration-200 ease-out ${
                          bidStrategy === b.value ? 'border-accent bg-accent/[0.06]' : 'border-border hover:bg-surface-2'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bid_strategy"
                          value={b.value}
                          checked={bidStrategy === b.value}
                          onChange={() => setBidStrategy(b.value)}
                          className="mt-0.5 accent-accent"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-text">{b.label}</span>
                          <span className="block text-xs text-text-3">{b.sub}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {bidStrategy !== 'LOWEST_COST_WITHOUT_CAP' && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="bid_amount" className={labelClass}>
                      {bidStrategy === 'COST_CAP' ? `Costo promedio objetivo (${accountCurrency})` : `Tope de puja (${accountCurrency})`}
                    </label>
                    <input
                      id="bid_amount"
                      name="bid_amount"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                )}
              </div>

              {/* PASO 4 — Ad Set y Anuncio */}
              <div className={step === 4 ? 'flex flex-col gap-5' : 'hidden'}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className={`mb-2 ${labelClass}`}>Ubicaciones</p>
                    <div className="inline-flex rounded-control border border-border p-0.5">
                      <button
                        type="button"
                        aria-pressed={placementsMode === 'automatic'}
                        onClick={() => setPlacementsMode('automatic')}
                        className={`rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
                          placementsMode === 'automatic' ? 'bg-primary text-white' : 'text-text-2 hover:text-text'
                        }`}
                      >
                        Automáticas
                      </button>
                      <button
                        type="button"
                        aria-pressed={placementsMode === 'manual'}
                        onClick={() => setPlacementsMode('manual')}
                        className={`rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
                          placementsMode === 'manual' ? 'bg-primary text-white' : 'text-text-2 hover:text-text'
                        }`}
                      >
                        Elegir manualmente
                      </button>
                    </div>
                    <input type="hidden" name="placements_mode" value={placementsMode} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="page_id" className={labelClass}>
                      Página de Facebook
                    </label>
                    <select
                      id="page_id"
                      name="page_id"
                      required
                      className={fieldClass}
                      value={pageId}
                      onChange={(e) => setPageId(e.target.value)}
                    >
                      {pages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {placementsMode === 'manual' && (
                  <div className="-mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { key: 'placement_facebook', label: 'Facebook Feed' },
                      { key: 'placement_instagram', label: 'Instagram Feed' },
                      { key: 'placement_stories', label: 'Stories' },
                      { key: 'placement_reels', label: 'Reels' },
                    ].map((p) => (
                      <label key={p.key} className="flex items-center gap-2 rounded-control border border-border px-3 py-2 text-sm text-text">
                        <input type="checkbox" name={p.key} value="1" defaultChecked className="accent-accent" />
                        {p.label}
                      </label>
                    ))}
                  </div>
                )}

                {objectiveDef.needsPixel && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pixel_id" className={labelClass}>
                      Pixel
                    </label>
                    {pixels.length === 0 ? (
                      <p className="text-xs text-amber">
                        No encontramos ningún pixel en tu cuenta — este objetivo lo necesita. Creá uno en Meta Events
                        Manager primero.
                      </p>
                    ) : (
                      <select
                        id="pixel_id"
                        name="pixel_id"
                        required
                        className={fieldClass}
                        value={pixelId}
                        onChange={(e) => setPixelId(e.target.value)}
                      >
                        {pixels.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="rounded-control border border-border">
                  {/* Hidden inputs siempre presentes, el panel se puede colapsar sin perder la selección. */}
                  {advKeys.map((key) => (
                    <input key={key} type="hidden" name={`adv_${key}`} value={advControls[key] ? '1' : '0'} />
                  ))}
                  <button
                    type="button"
                    aria-expanded={advDetailOpen}
                    onClick={() => setAdvDetailOpen((v) => !v)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-text">Automatizaciones de Meta</span>
                      <span className="block text-xs text-text-2">Qué puede tocar Meta de tu creativo automáticamente</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          advOffCount === 0 ? 'bg-green/[0.12] text-green' : advAllOff ? 'bg-surface-2 text-text-3' : 'bg-amber/[0.12] text-amber'
                        }`}
                      >
                        {advOffCount === 0 ? 'Todo permitido' : advAllOff ? 'Todo bloqueado' : `${advOffCount} desactivadas`}
                      </span>
                      <svg
                        width="9"
                        height="9"
                        viewBox="0 0 10 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`shrink-0 text-text-3 transition-transform duration-200 ease-out ${advDetailOpen ? 'rotate-90' : ''}`}
                      >
                        <path d="M3.5 2.5l4 2.5-4 2.5" />
                      </svg>
                    </span>
                  </button>

                  {advDetailOpen && (
                    <div className="flex flex-col gap-3 border-t border-border p-4">
                      <button
                        type="button"
                        onClick={toggleAdvMaster}
                        className="self-start rounded-control border border-border px-3 py-1.5 text-xs font-semibold text-text-2 transition-colors duration-200 ease-out hover:text-text"
                      >
                        {advAllOff ? 'Permitir todo' : 'Bloquear todo'}
                      </button>
                      {advKeys.map((key) => (
                        <div key={key} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-text">{ADV_CONTROLS[key].label}</p>
                            <p className="text-xs text-text-3">{ADV_CONTROLS[key].sub}</p>
                          </div>
                          <button
                            type="button"
                            aria-pressed={advControls[key]}
                            onClick={() => toggleAdvControl(key)}
                            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition-colors duration-200 ease-out ${
                              advControls[key] ? 'bg-primary text-white' : 'bg-surface-2 text-text-3'
                            }`}
                          >
                            {advControls[key] ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text">Conjuntos de anuncios</p>
                      {addingToExisting && (
                        <p className="mt-0.5 text-xs text-accent">
                          Se agregan dentro de {selectedExistingCampaign ? `"${selectedExistingCampaign.name}"` : 'la campaña elegida'} — no crean campaña nueva.
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-text-3">
                      {adSetIds.length} conjunto{adSetIds.length === 1 ? '' : 's'} — para testear, agregá más de uno
                    </span>
                  </div>

                  <input type="hidden" name="adset_count" value={adSetIds.length} />

                  <div className="flex flex-col gap-3">
                    {adSetIds.map((adSetId, adSetIndex) => (
                      <AdSetEditor
                        key={adSetId}
                        index={adSetIndex}
                        setNumber={adSetIndex + 1}
                        audiences={audiences}
                        scripts={scripts}
                        existingPosts={existingPosts}
                        libraryCreatives={libraryCreatives}
                        instagramPosts={instagramPosts}
                        igActorId={igActorId}
                        removable={adSetIds.length > 1}
                        onRemove={() => removeAdSet(adSetId)}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addAdSet}
                    className="mt-3 rounded-control border border-dashed border-border px-4 py-2.5 text-sm font-semibold text-accent transition-colors duration-200 ease-out hover:border-accent hover:bg-accent/[0.04]"
                  >
                    + Agregar otro conjunto (para comparar variantes)
                  </button>
                </div>
              </div>
            </div>

            {/* Navegación */}
            <div className="flex shrink-0 items-center justify-between border-t border-border px-6 py-4">
              <div className="flex items-center gap-3">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
                    className="text-sm font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
                  >
                    ← Atrás
                  </button>
                )}
                <span className="text-xs text-text-3">Paso {step} de 4</span>
              </div>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
                  className="rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
                >
                  Siguiente →
                </button>
              ) : (
                <SubmitButton addingToExisting={campaignMode === 'existing'} />
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
