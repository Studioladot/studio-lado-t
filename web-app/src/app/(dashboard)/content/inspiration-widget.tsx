'use client'

import { useEffect, useState } from 'react'
import { generateContentIdeaAction } from './actions'

// "Inspiración / Desbloqueo Creativo" (reestructuración de Contenido,
// 2026-08-05) — para cuando el usuario no tiene ideas. Intercala tips fijos
// (rotan localmente, sin costo) con ideas generadas por IA bajo demanda.
//
// El tope de "3 por día" es deliberadamente solo visual/de UX (pedido
// explícito) — localStorage fecha-scoped, se resetea solo al cambiar de
// día. La protección de costo REAL es el cupo mensual de IA que ya
// comparten IA Estratégica/Diario de Marca (ver checkIaUsage en
// generateContentIdeaAction, content/actions.ts) — este contador de acá
// nunca reemplaza esa capa server-side, solo evita que alguien gaste sus 3
// ideas del día sin darse cuenta.
const DAILY_LIMIT = 3
const USAGE_STORAGE_KEY = 'gotix_idea_gen_usage'

const STRATEGIC_TIPS = [
  'Entrá a Pinterest y buscá la estética de tu nicho para inspirarte.',
  '¿Qué problema urgente tiene tu cliente hoy? Respondéselo en un Reel.',
  'Mirá los comentarios de tus últimos posts — ahí hay preguntas que podés convertir en contenido.',
  'Contá el proceso detrás de tu producto — la gente confía más en lo que puede ver hacerse.',
  'Respondé a una objeción de venta común directamente en un video corto.',
  'Mostrá un antes/después real de un cliente o de tu propio trabajo.',
  'Grabá un mito común de tu rubro y desmentilo en 30 segundos.',
  'Preguntale algo a tu audiencia en una encuesta de Stories — la respuesta es tu próximo posteo.',
  'Reutilizá tu contenido con mejor rendimiento del mes pasado con un ángulo nuevo.',
  'Mostrale a tu audiencia algo que nadie ve — el detrás de escena siempre engancha.',
]

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function readUsage(): number {
  try {
    const raw = window.localStorage.getItem(USAGE_STORAGE_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as { date: string; count: number }
    return parsed.date === todayStr() ? parsed.count : 0
  } catch {
    return 0
  }
}

function writeUsage(count: number) {
  window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify({ date: todayStr(), count }))
}

export function InspirationWidget() {
  // Determinístico (día del mes, no Math.random()) — este widget se
  // server-renderea en el primer load de /content (tab "Control" es la
  // default), un índice random acá desincronizaría el HTML del servidor
  // del primer render del cliente.
  const [tipIndex, setTipIndex] = useState(() => new Date().getDate() % STRATEGIC_TIPS.length)
  const [aiIdea, setAiIdea] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usedToday, setUsedToday] = useState<number | null>(null)

  // El contador real vive en localStorage — no existe en el servidor, así
  // que se lee recién acá (efecto, solo cliente) en vez de en el
  // inicializador de useState, mismo criterio que el resto de la sesión
  // para storage de solo-browser.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee localStorage, no existe durante SSR.
    setUsedToday(readUsage())
  }, [])

  const remaining = usedToday === null ? DAILY_LIMIT : Math.max(0, DAILY_LIMIT - usedToday)

  function nextTip() {
    setAiIdea(null)
    setError(null)
    setTipIndex((i) => (i + 1) % STRATEGIC_TIPS.length)
  }

  async function handleGenerate() {
    const used = readUsage()
    if (used >= DAILY_LIMIT) {
      setUsedToday(used)
      return
    }
    setLoading(true)
    setError(null)
    const result = await generateContentIdeaAction()
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setAiIdea(result.idea)
    const next = used + 1
    writeUsage(next)
    setUsedToday(next)
  }

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Desbloqueo creativo</p>
        {usedToday !== null && (
          <span className="text-[10px] text-text-3">{remaining}/{DAILY_LIMIT} ideas hoy</span>
        )}
      </div>

      <div className="min-h-[52px] rounded-control border border-dashed border-border bg-surface-2/40 px-3 py-2.5">
        {error ? (
          <p className="text-xs text-red">{error}</p>
        ) : aiIdea ? (
          <>
            <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-accent">Idea generada</p>
            <p className="text-xs text-text">{aiIdea}</p>
          </>
        ) : (
          <>
            <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-text-3">Tip estratégico</p>
            <p className="text-xs text-text">{STRATEGIC_TIPS[tipIndex]}</p>
          </>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={nextTip}
          className="rounded-control border border-border px-3 py-1.5 text-[11px] font-semibold text-text-2 transition-colors duration-200 ease-out hover:text-text"
        >
          Otro tip
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || remaining === 0}
          className="rounded-control bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Generando…' : remaining === 0 ? 'Volvé mañana' : 'Generar idea'}
        </button>
      </div>
    </div>
  )
}
