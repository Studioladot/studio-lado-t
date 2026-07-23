'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { unifyContentItems } from './unified-items'
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

export function ControlPanel({ posts, pieces, campaigns }: { posts: Post[]; pieces: Piece[]; campaigns: Campaign[] }) {
  const meta = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setMeta = useCallback((value: number) => {
    window.localStorage.setItem(META_STORAGE_KEY, String(value))
    window.dispatchEvent(new Event(META_CHANGE_EVENT))
  }, [])

  const stats = useMemo(() => {
    const items = unifyContentItems(posts, pieces, campaigns)
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

    return { postsSem, pct, mesPosts, racha, topFmt, topPlat, sortedFmt, maxF, dias7, semanaLabel }
  }, [posts, pieces, campaigns, meta])

  const stateKey = stats.postsSem === 0 ? 0 : stats.pct < 50 ? 'low' : stats.pct < 100 ? 'mid' : 'ok'
  const STATE = {
    0: { grad: 'linear-gradient(135deg,#3a1220 0%,#1a0a10 100%)', bar: '#F04438', msg: `Solo subiste 0 esta semana. ¡Hoy es el día para arrancar!` },
    low: { grad: 'linear-gradient(135deg,#3d2a0a 0%,#221703 100%)', bar: '#F79009', msg: `Solo subiste ${stats.postsSem} esta semana. Podés dar más, apuntá a ${meta}` },
    mid: { grad: 'linear-gradient(135deg,#0a2540 0%,#051222 100%)', bar: '#2E90FA', msg: `Vas bien con ${stats.postsSem} posts. ¡Seguí que falta poco para la meta!` },
    ok: { grad: 'linear-gradient(135deg,#03301f 0%,#031a11 100%)', bar: '#12B76A', msg: `✅ Meta cumplida esta semana! ${stats.postsSem}/${meta} ¡Sos una máquina!` },
  } as const
  const st = STATE[stateKey]

  return (
    <div>
      <div
        className="mb-4 overflow-hidden rounded-card p-6 text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,.35)]"
        style={{ background: st.grad }}
      >
        <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[.12em] opacity-55">
          Esta semana · {stats.semanaLabel.toUpperCase()}
        </div>
        <div className="mb-4 flex items-end gap-4">
          <div className="text-[44px] font-extrabold leading-none tracking-tight">{stats.postsSem}</div>
          <div className="mb-1 text-xs opacity-65">
            de{' '}
            <input
              type="number"
              min={1}
              max={30}
              value={meta}
              onChange={(e) => setMeta(Number(e.target.value) || DEFAULT_META)}
              className="w-12 rounded border-none bg-white/10 px-1 py-0.5 text-center text-base font-bold text-white outline-none"
            />{' '}
            que te propusiste
          </div>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/[0.14]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${stats.pct}%`, background: st.bar }}
          />
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13.5px] font-semibold">
          {st.msg}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Este mes" value={stats.mesPosts.length} sub="publicaciones" />
        <StatCard label="Racha actual" value={stats.racha || '—'} sub="días seguidos" />
        <StatCard label="Formato top" value={stats.topFmt?.[0] ?? '—'} sub="más publicado" />
        <StatCard label="Plataforma top" value={stats.topPlat?.[0] ?? '—'} sub="más activa" />
      </div>

      <div className="mb-4 rounded-card border border-border bg-surface p-4">
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
              <div
                key={fd}
                className={`rounded-control px-1 py-2 text-center ${
                  count > 0 ? 'bg-accent text-white' : 'border border-border bg-surface-2 text-text-3'
                } ${esHoy ? 'ring-2 ring-accent' : ''}`}
              >
                <div className="text-[10px] font-semibold uppercase">
                  {d.toLocaleDateString('es-AR', { weekday: 'short' })}
                </div>
                <div className="text-lg font-extrabold">{count || ''}</div>
                <div className="text-[10px] opacity-70">{d.getDate()}</div>
              </div>
            )
          })}
        </div>
      </div>
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
