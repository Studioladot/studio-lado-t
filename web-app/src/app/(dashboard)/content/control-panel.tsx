'use client'

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { unifyContentItems } from './unified-items'
import { DayBreakdownModal } from './day-breakdown-modal'
import { InspirationWidget } from './inspiration-widget'
import { computeWeeklyWinner } from '@/lib/content/weekly-winner'
import type { InstagramCatalogRow } from '@/lib/instagram/media-catalog-winners'
import type { Database } from '@/lib/types/database.types'

type Post = Database['public']['Tables']['content_posts']['Row']
type Piece = Database['public']['Tables']['content_piezas']['Row']
type Campaign = Database['public']['Tables']['content_campaigns']['Row']

const META_STORAGE_KEY = 'gotix_cont_meta'
const META_CHANGE_EVENT = 'gotix-cont-meta-change'
const DEFAULT_META = 5

function subscribe(callback: () => void) {
  window.addEventListener(META_CHANGE_EVENT, callback)
  return () => window.removeEventListener(META_CHANGE_EVENT, callback)
}

function getSnapshot() {
  const raw = window.localStorage.getItem(META_STORAGE_KEY)
  const parsed = raw ? parseInt(raw, 10) : DEFAULT_META
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_META
}

function getServerSnapshot() {
  return DEFAULT_META
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function startOfWeek(d: Date) {
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - day)
  monday.setHours(0, 0, 0, 0)
  return monday
}

const FORMAT_COLOR: Record<string, string> = {
  Reel: 'bg-accent',
  TikTok: 'bg-red',
  Carrusel: 'bg-[#2E90FA]',
  Historia: 'bg-amber',
  Post: 'bg-green',
  Otro: 'bg-text-2',
}

/**
 * Gauge circular vía stroke-dasharray/dashoffset — sin librería, un solo
 * uso. Rotado -90° para que el trazo arranque arriba (12 en punto) en vez
 * de a la derecha (comportamiento default de SVG).
 */
function RadialGauge({ score, color }: { score: number; color: string }) {
  const r = 40
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100)
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
      <circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

function healthTier(score: number) {
  if (score >= 80) return { label: 'Excelente', color: 'var(--green)', msg: 'Tu constancia está en su mejor momento — seguí así.' }
  if (score >= 55) return { label: 'Buena', color: 'var(--accent)', msg: 'Vas bien, pero todavía hay margen para ser más constante.' }
  if (score >= 30) return { label: 'Irregular', color: 'var(--amber)', msg: 'Tu constancia varía de semana en semana — hay margen para afianzar el ritmo.' }
  return { label: 'Necesita atención', color: 'var(--red)', msg: 'Es un buen momento para retomar una cadencia más regular de publicaciones.' }
}

/**
 * Veredicto de la semana ANTERIOR (ya cerrada, Lunes a Domingo) — el único
 * lugar del panel donde corresponde evaluar un resultado ya cerrado: no
 * hay más tiempo calendario para cambiarlo. Nunca se aplica a la semana en
 * curso (ver currentWeekMotivation) — ajuste conceptual pedido
 * explícitamente (2026-08-06): evaluar negativamente una semana que
 * todavía no terminó desmotiva al usuario y da mala imagen frente a un
 * cliente que mira el panel de la agencia. Vocabulario profesional, sin
 * palabras como "floja"/"crítica" — describe el resultado, no juzga al
 * usuario (mismo criterio 2026-08-06, segunda ronda).
 */
function pastWeekVerdict(pct: number): { label: string; color: string } {
  if (pct >= 100) return { label: 'Objetivo cumplido', color: 'var(--green)' }
  if (pct >= 50) return { label: 'Buena semana', color: 'var(--accent)' }
  if (pct > 0) return { label: 'Por debajo del objetivo', color: 'var(--amber)' }
  return { label: 'Sin actividad', color: 'var(--red)' }
}

/**
 * Copy de la semana EN CURSO — exactamente 3 estados, ninguno negativo
 * (pedido explícito, 2026-08-06: "bajo ningún punto de vista" un juicio
 * tipo "Floja" mientras la semana no cerró — ni siquiera a mitad de
 * camino, 2 o 3 de 5 es un estado perfecto porque todavía es martes).
 * Puramente visual/alentador: 0% arranca la semana, 1-99% es progreso en
 * curso (un solo mensaje para todo el rango, sin sub-tramos), 100% es
 * logro cumplido.
 */
function currentWeekMotivation(pct: number): string {
  if (pct >= 100) return '¡Objetivo semanal cumplido!'
  if (pct > 0) return '¡Vas por buen camino!'
  return '¡Semana nueva, a crear!'
}

export function ControlPanel({
  posts,
  pieces,
  campaigns,
  instagramCatalog,
  onGoToPerformance,
}: {
  posts: Post[]
  pieces: Piece[]
  campaigns: Campaign[]
  instagramCatalog: InstagramCatalogRow[]
  onGoToPerformance: () => void
}) {
  const meta = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [viewingDay, setViewingDay] = useState<string | null>(null)

  const setMeta = useCallback((value: number) => {
    window.localStorage.setItem(META_STORAGE_KEY, String(value))
    window.dispatchEvent(new Event(META_CHANGE_EVENT))
  }, [])

  const items = useMemo(() => unifyContentItems(posts, pieces, campaigns), [posts, pieces, campaigns])

  const itemsByDate = useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const item of items) {
      if (!item.date) continue
      const list = map.get(item.date) ?? []
      list.push(item)
      map.set(item.date, list)
    }
    return map
  }, [items])

  const stats = useMemo(() => {
    const publicadas = items.filter((i) => i.status === 'publicado' && i.date)

    const hoy = new Date()
    const lunes = startOfWeek(hoy)
    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)

    const semana = publicadas.filter((p) => p.date! >= toDateStr(lunes) && p.date! <= toDateStr(domingo))
    const postsSem = semana.length
    const pct = Math.min(100, Math.round((postsSem / meta) * 100))

    const mesActual = hoy.toISOString().substring(0, 7)
    const mesPosts = publicadas.filter((p) => (p.date ?? '').startsWith(mesActual))

    const fechasPub = [...new Set(publicadas.map((p) => p.date!))].sort((a, b) => b.localeCompare(a))
    let racha = 0
    const checkDate = new Date(hoy)
    for (let i = 0; i < 60; i++) {
      const fd = toDateStr(checkDate)
      if (fechasPub.includes(fd)) {
        racha++
        checkDate.setDate(checkDate.getDate() - 1)
      } else break
    }

    // Health Score / "medidor de consistencia" (2026-08-05, corregido
    // 2026-08-06): combina qué tan viva está la racha actual (35%, tope en
    // 14 días seguidos = full marks) con el cumplimiento real de la meta
    // semanal en las últimas 4 semanas YA CERRADAS (65%) — a propósito
    // arranca en `i=1`, nunca `i=0` (la semana en curso): incluirla acá
    // era el bug real reportado, el score bajaba y mostraba "Floja" solo
    // porque todavía no habían pasado los 7 días para llegar a la meta.
    const weeklyPctLast4Complete = Array.from({ length: 4 }, (_, i) => {
      const weekStart = new Date(lunes)
      weekStart.setDate(lunes.getDate() - 7 * (i + 1))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const count = publicadas.filter((p) => p.date! >= toDateStr(weekStart) && p.date! <= toDateStr(weekEnd)).length
      return meta > 0 ? Math.min(100, (count / meta) * 100) : 0
    })
    const avgWeeklyPct = weeklyPctLast4Complete.reduce((a, b) => a + b, 0) / weeklyPctLast4Complete.length
    const streakPct = Math.min(100, (racha / 14) * 100)
    const healthScore = Math.round(streakPct * 0.35 + avgWeeklyPct * 0.65)

    // Semana pasada (Lunes a Domingo inmediatamente anterior a la actual) —
    // la única semana sobre la que el panel emite un veredicto tipo
    // "Floja"/"Objetivo cumplido": ya cerró, no hay más tiempo calendario
    // para cambiarla.
    const lastWeekStart = new Date(lunes)
    lastWeekStart.setDate(lunes.getDate() - 7)
    const lastWeekEnd = new Date(lastWeekStart)
    lastWeekEnd.setDate(lastWeekStart.getDate() + 6)
    const lastWeekCount = publicadas.filter((p) => p.date! >= toDateStr(lastWeekStart) && p.date! <= toDateStr(lastWeekEnd)).length
    const lastWeekPct = meta > 0 ? Math.round((lastWeekCount / meta) * 100) : 0

    const last30Start = new Date(hoy)
    last30Start.setMonth(hoy.getMonth() - 1)
    const last30 = publicadas.filter((p) => p.date! >= toDateStr(last30Start))

    const countBy = (arr: typeof last30, key: 'format' | 'platform') =>
      arr.reduce<Record<string, number>>((acc, p) => {
        const value = p[key]
        if (!value) return acc
        acc[value] = (acc[value] ?? 0) + 1
        return acc
      }, {})

    const fmtCount = countBy(last30, 'format')
    const platCount = countBy(last30, 'platform')
    const topFmt = Object.entries(fmtCount).sort((a, b) => b[1] - a[1])[0]
    const topPlat = Object.entries(platCount).sort((a, b) => b[1] - a[1])[0]
    const sortedFmt = Object.entries(fmtCount).sort((a, b) => b[1] - a[1])
    const maxF = sortedFmt[0]?.[1] ?? 1

    const dias7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy)
      d.setDate(hoy.getDate() - 6 + i)
      const fd = toDateStr(d)
      return { date: d, count: publicadas.filter((p) => p.date === fd).length }
    })
    const semanaLabel = `${lunes.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${domingo.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`

    return { postsSem, pct, mesPosts, racha, healthScore, lastWeekPct, topFmt, topPlat, sortedFmt, maxF, dias7, semanaLabel }
  }, [items, meta])

  const tier = healthTier(stats.healthScore)
  const pastWeek = pastWeekVerdict(stats.lastWeekPct)
  const weeklyWinner = useMemo(() => computeWeeklyWinner(instagramCatalog), [instagramCatalog])

  return (
    <div>
      <div className="content-health-hero mb-4 rounded-card p-6 text-white">
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <RadialGauge score={stats.healthScore} color={tier.color} />
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-extrabold leading-none">{stats.healthScore}</span>
              <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/50">score</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[.12em] text-white/50">Salud de tu cuenta de contenido</p>
            <p className="mt-0.5 text-2xl font-extrabold tracking-tight" style={{ color: tier.color }}>
              {tier.label}
            </p>
            <p className="mt-1 text-[13px] text-white/70">{tier.msg}</p>
            <span
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
              style={{ backgroundColor: `${pastWeek.color}26`, color: pastWeek.color }}
            >
              Semana pasada: {pastWeek.label}
            </span>
          </div>
        </div>

        {/* Semana en curso — a propósito nunca un veredicto (ver
            currentWeekMotivation): mientras queden días de calendario para
            llegar a la meta, esto es progreso, no una nota. */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/70">
            <span>
              Objetivo semanal: <strong className="text-white">{stats.postsSem}</strong>/
              <input
                type="number"
                min={1}
                max={30}
                value={meta}
                onChange={(e) => setMeta(Number(e.target.value) || DEFAULT_META)}
                className="mx-0.5 w-9 rounded border-none bg-white/10 px-1 py-0.5 text-center font-bold text-white outline-none"
              />
              completados
            </span>
            <span>
              Racha: <strong className="text-white">{stats.racha || 0}</strong> días seguidos
            </span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white/80 transition-all duration-500"
              style={{ width: `${Math.min(100, stats.pct)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-white/60">{currentWeekMotivation(stats.pct)}</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Este mes" value={stats.mesPosts.length} sub="publicaciones" />
        <StatCard label="Formato top" value={stats.topFmt?.[0] ?? '—'} sub="más publicado" />
        <StatCard label="Plataforma top" value={stats.topPlat?.[0] ?? '—'} sub="más activa" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-border bg-surface p-4">
            <p className="mb-3 text-sm font-semibold text-text">Ranking de formatos (últimos 30 días)</p>
            {stats.sortedFmt.length === 0 ? (
              <p className="text-sm text-text-2">Sin publicaciones en los últimos 30 días</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.sortedFmt.map(([fmt, count]) => (
                  <div key={fmt} className="flex items-center gap-2.5">
                    <span className="w-20 text-xs font-semibold text-text-2">{fmt}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-surface-2">
                      <div
                        className={`flex h-full items-center rounded pl-2 transition-all duration-300 ${FORMAT_COLOR[fmt] ?? 'bg-text-2'}`}
                        style={{ width: `${Math.round((count / stats.maxF) * 100)}%` }}
                      >
                        <span className="text-[11px] font-bold text-white">{count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-card border border-border bg-surface p-4">
            <p className="mb-3 text-sm font-semibold text-text">Últimos 7 días</p>
            <div className="grid grid-cols-7 gap-1.5">
              {stats.dias7.map(({ date: d, count }) => {
                const fd = toDateStr(d)
                const esHoy = fd === toDateStr(new Date())
                return (
                  <button
                    key={fd}
                    type="button"
                    onClick={() => setViewingDay(fd)}
                    className={`rounded-control px-1 py-2 text-center transition-transform duration-150 ease-out hover:scale-[1.04] ${
                      count > 0 ? 'bg-accent text-white' : 'border border-border bg-surface-2 text-text-3'
                    } ${esHoy ? 'ring-2 ring-accent' : ''}`}
                  >
                    <div className="text-[10px] font-semibold uppercase">
                      {d.toLocaleDateString('es-AR', { weekday: 'short' })}
                    </div>
                    <div className="text-lg font-extrabold">{count || ''}</div>
                    <div className="text-[10px] opacity-70">{d.getDate()}</div>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[10px] text-text-3">Tocá un día para ver qué se subió y qué faltó subir.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-accent/25 bg-accent/4 p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-accent">Ganador de la semana</p>
            {weeklyWinner ? (
              <>
                <p className="text-sm font-semibold text-text">{weeklyWinner.spoiler}</p>
                <p className="mt-2 text-[11px] text-text-3">{weeklyWinner.views.toLocaleString('es-AR')} reproducciones · {weeklyWinner.format}</p>
                <button
                  type="button"
                  onClick={onGoToPerformance}
                  className="mt-3 rounded-control border border-accent/30 bg-accent/8 px-3 py-1.5 text-[11px] font-semibold text-accent transition-all duration-200 ease-out hover:bg-accent/14"
                >
                  Ver análisis completo →
                </button>
              </>
            ) : (
              <p className="text-xs text-text-2">Todavía no hay suficientes datos de esta semana para elegir un ganador.</p>
            )}
          </div>

          <InspirationWidget />
        </div>
      </div>

      {viewingDay && (
        <DayBreakdownModal date={viewingDay} items={itemsByDate.get(viewingDay) ?? []} onClose={() => setViewingDay(null)} />
      )}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-xs text-text-2">{label}</p>
      <p className="mt-1 text-lg font-bold text-text">{value}</p>
      <p className="mt-0.5 text-[11px] text-text-2">{sub}</p>
    </div>
  )
}
