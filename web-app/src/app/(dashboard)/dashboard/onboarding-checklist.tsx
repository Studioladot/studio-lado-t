'use client'

import { useEffect, useState } from 'react'
import { connectMetaAction } from '../actions'

// "Flujo de Onboarding (Primeros Pasos)" (2026-08-05) — foco en retención
// inicial: una organización recién creada no tiene ni Meta ni Instagram
// conectados, así que Dashboard/Rendimiento/Autopiloto están todos vacíos
// sin que quede claro por qué. Este checklist guía los 3 pasos reales que
// hacen falta — connectMetaAction es la MISMA Server Action que ya usa
// /settings/integrations tanto para "Conectar Meta" como para "Conectar
// Instagram" (ver api/meta/callback/route.ts: cuentas publicitarias e
// Instagram se resuelven en la misma vuelta de OAuth), así que reusarla acá
// no duplica ningún flujo nuevo.
//
// Pasos 1 y 2 comparten la misma señal (meta_connections existe) — Meta no
// expone un estado persistido de "ya elegiste la cuenta publicitaria" aparte
// de la conexión en sí (con una sola cuenta se guarda directo, con varias se
// resuelve en /meta-ads/connections/select-account antes de volver acá), así
// que ambos se marcan listos juntos en vez de fingir un progreso que no
// existe.
//
// Persistencia del cierre: localStorage para "ya vi la pantalla de
// completado" (una sola vez en la vida de este browser, no tiene sentido
// festejarlo de nuevo); sessionStorage para "por ahora no" en el flujo
// incompleto (no insiste en cada navegación de la sesión actual, pero vuelve
// a aparecer en la próxima sesión si todavía falta algo).
const SEEN_COMPLETE_KEY = 'gotix_onboarding_seen_complete'
const DISMISS_KEY = 'gotix_onboarding_dismissed'

type StepId = 1 | 2 | 3 | 4

const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: 'Conectar Meta' },
  { id: 2, label: 'Seleccionar cuentas publicitarias' },
  { id: 3, label: 'Conectar Páginas / Instagram' },
  { id: 4, label: '¡Completado!' },
]

const PILL_BUTTON =
  'self-start rounded-[20px] bg-primary px-6 py-[11px] text-sm font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]'

export function OnboardingChecklist({ metaConnected, igConnected }: { metaConnected: boolean; igConnected: boolean }) {
  const allDone = metaConnected && igConnected
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (allDone) {
      const seenComplete = localStorage.getItem(SEEN_COMPLETE_KEY) === '1'
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lee un storage solo de browser, no hay forma de resolverlo durante el render.
      setVisible(!seenComplete)
      return
    }
    const dismissed = sessionStorage.getItem(DISMISS_KEY) === '1'
    setVisible(!dismissed)
  }, [allDone])

  function handleClose() {
    if (allDone) localStorage.setItem(SEEN_COMPLETE_KEY, '1')
    else sessionStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  useEffect(() => {
    if (!visible) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!visible) return null

  const doneMap: Record<StepId, boolean> = {
    1: metaConnected,
    2: metaConnected,
    3: igConnected,
    4: allDone,
  }
  const currentStep = (STEPS.find((s) => !doneMap[s.id])?.id ?? 4) as StepId

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-[720px] max-w-full overflow-hidden rounded-card border border-border bg-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]">
        {/* Checklist lateral */}
        <div className="flex w-[240px] shrink-0 flex-col gap-1 border-r border-border bg-surface-2/40 p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Primeros pasos</p>
          {STEPS.map((s) => {
            const done = doneMap[s.id]
            const active = s.id === currentStep
            return (
              <div
                key={s.id}
                className={`flex items-center gap-2.5 rounded-control px-2.5 py-2 ${active && !done ? 'bg-accent/[0.08]' : ''}`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    done ? 'bg-green text-white' : active ? 'bg-primary text-white' : 'bg-surface-2 text-text-3'
                  }`}
                >
                  {done ? (
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                  ) : (
                    s.id
                  )}
                </span>
                <span className={`text-[13px] font-semibold ${done || active ? 'text-text' : 'text-text-3'}`}>{s.label}</span>
              </div>
            )
          })}
        </div>

        {/* Panel principal */}
        <div className="flex min-w-0 flex-1 flex-col p-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-accent">Bienvenido a Gotix</p>
              <h2 className="mt-1 text-lg font-bold text-text">
                {allDone ? '¡Todo listo!' : !metaConnected ? 'Conectá tu cuenta de Meta' : 'Conectá tus Páginas e Instagram'}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-3 transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {allDone ? (
            <>
              <p className="mb-6 max-w-sm text-sm leading-relaxed text-text-2">
                Ya conectaste tu cuenta de Meta y tu Instagram — Gotix ya tiene todo lo que necesita para mostrarte
                campañas, métricas reales y el Autopiloto.
              </p>
              <button type="button" onClick={handleClose} className={PILL_BUTTON}>
                Empezar a usar Gotix
              </button>
            </>
          ) : !metaConnected ? (
            <>
              <p className="mb-6 max-w-sm text-sm leading-relaxed text-text-2">
                Vinculá tu Business Manager de Meta para traer tus cuentas publicitarias, campañas y métricas reales a
                Gotix.
              </p>
              <form action={connectMetaAction}>
                <button type="submit" className={PILL_BUTTON}>
                  Conectar con Meta
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="mb-6 max-w-sm text-sm leading-relaxed text-text-2">
                Ya conectaste Meta — ahora elegí con qué Página de Facebook e Instagram vas a publicar contenido y
                medir resultados.
              </p>
              <form action={connectMetaAction}>
                <button
                  type="submit"
                  className="self-start rounded-[20px] px-6 py-[11px] text-sm font-bold text-white shadow-[0_0_16px_rgba(225,48,108,0.35)] transition-all duration-200 ease-out active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg,#FFC107,#E1306C,#5851DB)' }}
                >
                  Conectar Páginas / Instagram
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
