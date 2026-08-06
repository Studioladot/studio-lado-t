'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { generateContentIdeaAction, getIdeaGenUsageAction } from './actions'

// "Inspiración / Desbloqueo Creativo" (reestructuración de Contenido,
// 2026-08-05) — para cuando el usuario no tiene ideas. Intercala tips fijos
// (rotan localmente, sin costo) con ideas generadas por IA (DeepSeek, ver
// lib/ia/client.ts) bajo demanda.
//
// El tope de "3 por día" es real y server-side (checkIdeaGenDailyUsage,
// lib/ia/usage.ts, por USUARIO) — este componente no lleva su propio
// contador, solo refleja lo que el servidor ya sabe: lee `remaining` al
// montar (getIdeaGenUsageAction) para que el botón nazca deshabilitado si
// el usuario ya gastó sus 3 antes de refrescar la página, y lo actualiza
// con el valor que devuelve cada generateContentIdeaAction exitoso.
const DAILY_LIMIT = 3

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

export function InspirationWidget() {
  // Determinístico (día del mes, no Math.random()) — este widget se
  // server-renderea en el primer load de /content (tab "Control" es la
  // default), un índice random acá desincronizaría el HTML del servidor
  // del primer render del cliente.
  const [tipIndex, setTipIndex] = useState(() => new Date().getDate() % STRATEGIC_TIPS.length)
  const [aiIdea, setAiIdea] = useState<string | null>(null)
  const [savedToNotes, setSavedToNotes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    getIdeaGenUsageAction().then((usage) => {
      setRemaining(usage.remaining)
    })
  }, [])

  const displayRemaining = remaining ?? DAILY_LIMIT
  const limitReached = remaining === 0

  function nextTip() {
    setAiIdea(null)
    setSavedToNotes(false)
    setError(null)
    setTipIndex((i) => (i + 1) % STRATEGIC_TIPS.length)
  }

  async function handleGenerate() {
    if (limitReached || loading) return
    setLoading(true)
    setError(null)
    const result = await generateContentIdeaAction()
    setLoading(false)
    setRemaining(result.remaining)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setAiIdea(result.idea)
    setSavedToNotes(result.savedToNotes)
  }

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Desbloqueo creativo</p>
        {remaining !== null && (
          <span className="text-[10px] text-text-3">
            {displayRemaining}/{DAILY_LIMIT} ideas hoy
          </span>
        )}
      </div>

      <div className="min-h-[52px] rounded-control border border-dashed border-border bg-surface-2/40 px-3 py-2.5">
        {error ? (
          <p className="text-xs text-red">{error}</p>
        ) : aiIdea ? (
          <>
            <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-accent">Idea generada</p>
            <p className="text-xs leading-relaxed text-text">{aiIdea}</p>
            {savedToNotes && (
              <Link
                href="/notes"
                className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-green transition-colors duration-200 ease-out hover:text-green/80"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Guardada en Notas
              </Link>
            )}
          </>
        ) : (
          <>
            <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-text-3">Tip estratégico</p>
            <p className="text-xs leading-relaxed text-text">{STRATEGIC_TIPS[tipIndex]}</p>
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
          disabled={loading || limitReached}
          className="rounded-control bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-3 disabled:opacity-100"
        >
          {loading ? 'Generando…' : limitReached ? 'Límite diario alcanzado, ¡a crear!' : 'Generar idea'}
        </button>
      </div>
    </div>
  )
}
