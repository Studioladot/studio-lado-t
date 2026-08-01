'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AccountTrendChart } from './account-trend-chart'
import { ComparisonPanel } from './comparison-panel'
import { CrossPostModal } from './cross-post-modal'
import { TiktokPerformanceSection } from './tiktok-performance-section'
import type { AccountInsight, MediaInsight } from './content-tabs'
import type { WinningItem } from '@/lib/content/winners'
import type { TiktokVideoRow } from '@/lib/tiktok/winners'

function fmt(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('es-AR')
}

// "Rendimiento" — analítica orgánica de Instagram, alimentada exclusivamente
// por los snapshots cacheados que sincroniza instagram-metrics-sync (nunca
// fetch en vivo, mismo criterio que el resto de Gotix). Mismo tratamiento
// premium que Ventas: metric-card con delta+tabular-nums para los KPIs,
// tabla compacta y densa para el ranking. Incluye piezas de campaña Y
// publicaciones sueltas por igual — instagram_media_insights es polimórfico
// desde la ronda de Comparativa.

function money(n: number) {
  return n.toLocaleString('es-AR')
}

// Auditoría de cierre (2026-08-01): antes no había límite — seleccionar 10+
// piezas abría un ComparisonPanel con una tabla horizontal ilegible. 5 es el
// máximo que entra sin scroll horizontal en la mayoría de los anchos de
// pantalla que soporta el panel.
const MAX_COMPARE = 5

function itemTitle(m: MediaInsight): string {
  return m.content_piezas?.titulo ?? m.content_posts?.title ?? 'Sin título'
}

function itemPermalink(m: MediaInsight): string | null {
  return m.content_piezas?.ig_permalink ?? m.content_posts?.ig_permalink ?? null
}

function itemFormat(m: MediaInsight): string | null {
  return m.content_piezas?.formato ?? m.content_posts?.format ?? null
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="metric-card rounded-card px-4 pb-3 pt-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums text-text">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-text-3">{sub}</p>}
    </div>
  )
}

export function PerformanceTab({
  instagramConnected,
  igUsername,
  accountInsights,
  mediaInsights,
  winningItems,
  tiktokConnected,
  tiktokVideos,
}: {
  instagramConnected: boolean
  igUsername: string | null
  accountInsights: AccountInsight[]
  mediaInsights: MediaInsight[]
  winningItems: WinningItem[]
  tiktokConnected: boolean
  tiktokVideos: TiktokVideoRow[]
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [comparing, setComparing] = useState(false)
  const [crossPostItem, setCrossPostItem] = useState<WinningItem | null>(null)
  // Rediseño (2026-08-01): con las dos redes conectadas, antes se
  // apilaban verticalmente — separadas en sub-tabs para navegar en
  // entornos aislados. Si solo hay una red conectada, no tiene sentido
  // mostrar un toggle de una sola opción — se salta directo a esa sección.
  const [networkTab, setNetworkTab] = useState<'tiktok' | 'meta'>(tiktokConnected ? 'tiktok' : 'meta')
  const showNetworkTabs = instagramConnected && tiktokConnected

  // Antes esto cortaba TODO (incluida una futura sección de TikTok) si
  // Instagram no estaba conectado — Fase 1 del Hub Omnicanal (2026-08-01):
  // cada red se gatea de forma independiente más abajo, esto solo bloquea
  // si NINGUNA de las dos está conectada.
  if (!instagramConnected && !tiktokConnected) {
    return (
      <div className="rounded-card border border-dashed border-border bg-surface-2/40 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-text">Todavía no conectaste ninguna red</p>
        <p className="mx-auto mt-1 max-w-[380px] text-xs text-text-2">
          Conectá Instagram o TikTok desde Ajustes → Integraciones para ver reproducciones, alcance y rendimiento acá.
        </p>
        <Link
          href="/settings/integrations"
          className="mt-4 inline-block rounded-control bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
        >
          Ir a Conexiones
        </Link>
      </div>
    )
  }

  const latestAccount = accountInsights[accountInsights.length - 1] ?? null
  const weekAgoAccount = accountInsights.length >= 7 ? accountInsights[accountInsights.length - 7] : accountInsights[0] ?? null
  const followerDelta =
    latestAccount?.follower_count !== null && latestAccount?.follower_count !== undefined && weekAgoAccount?.follower_count !== null && weekAgoAccount?.follower_count !== undefined
      ? latestAccount.follower_count - weekAgoAccount.follower_count
      : null

  const reachLast7d = accountInsights.slice(-7).reduce((sum, d) => sum + (d.reach ?? 0), 0)

  const topByPlays = [...mediaInsights].sort((a, b) => (b.plays ?? b.reach ?? 0) - (a.plays ?? a.reach ?? 0)).slice(0, 10)
  const selectedItems = mediaInsights.filter((m) => selected.has(m.id))
  const instagramHasNoData = instagramConnected && accountInsights.length === 0 && mediaInsights.length === 0

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_COMPARE) next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {showNetworkTabs && (
        <div className="flex w-fit gap-1 rounded-control border border-border bg-surface-2/40 p-1">
          <button
            type="button"
            onClick={() => setNetworkTab('tiktok')}
            className={`rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
              networkTab === 'tiktok' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
            }`}
          >
            Rendimiento TikTok
          </button>
          <button
            type="button"
            onClick={() => setNetworkTab('meta')}
            className={`rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
              networkTab === 'meta' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
            }`}
          >
            Rendimiento Meta
          </button>
        </div>
      )}

      {tiktokConnected && (!showNetworkTabs || networkTab === 'tiktok') && <TiktokPerformanceSection videos={tiktokVideos} />}

      {instagramConnected &&
        (!showNetworkTabs || networkTab === 'meta') &&
        (instagramHasNoData ? (
          <div className="rounded-card border border-dashed border-border bg-surface-2/40 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-text">Instagram conectado{igUsername ? ` (@${igUsername})` : ''}, todavía sin datos</p>
            <p className="mx-auto mt-1 max-w-[380px] text-xs text-text-2">
              La sincronización corre una vez al día — la primera tanda de métricas va a aparecer acá después de la próxima corrida.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KpiCard label="Seguidores" value={fmt(latestAccount?.follower_count ?? null)} sub={latestAccount ? `al ${latestAccount.captured_at}` : undefined} />
              <KpiCard
                label="Variación 7 días"
                value={followerDelta === null ? '—' : `${followerDelta > 0 ? '+' : ''}${money(followerDelta)}`}
                sub="seguidores"
              />
              <KpiCard label="Alcance últimos 7 días" value={fmt(reachLast7d)} sub="suma diaria" />
            </div>

            <AccountTrendChart data={accountInsights} />

            {/* Ganadores (Épica Omnicanal, 2026-08-04) — picos de crecimiento
                detectados en src/lib/content/winners.ts, platform-agnóstico:
                ya funciona igual para TikTok en cuanto haya publicaciones de
                Gotix con métricas propias (no el catálogo sincronizado de
                arriba, que usa su propio criterio — ver
                src/lib/tiktok/winners.ts). */}
            {winningItems.length > 0 && (
              <div className="rounded-card border border-accent/30 bg-accent/[0.03] p-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Ganadores — pico de crecimiento</p>
                <ul className="flex flex-col gap-2">
                  {winningItems.map((w) => (
                    <li key={w.key} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border bg-surface px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-text">{w.title}</p>
                        <p className="text-[10px] text-text-3">
                          {w.previousPlays.toLocaleString('es-AR')} → {w.latestPlays.toLocaleString('es-AR')} reproducciones ·{' '}
                          <span className="font-semibold text-green">+{w.growthPct.toFixed(0)}%</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCrossPostItem(w)}
                        className="shrink-0 rounded-control border border-accent/30 bg-accent/[0.06] px-2.5 py-1 text-[11px] font-semibold text-accent transition-all duration-200 ease-out hover:bg-accent/[0.12]"
                      >
                        Resubir a otra plataforma
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-card border border-border bg-surface p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Piezas y publicaciones por reproducciones</p>
                  {selected.size > 0 && <p className="text-[10px] text-text-3">{selected.size}/{MAX_COMPARE} seleccionadas</p>}
                </div>
                {selected.size >= 2 && (
                  <button
                    type="button"
                    onClick={() => setComparing(true)}
                    className="rounded-control bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
                  >
                    Comparar ({selected.size})
                  </button>
                )}
              </div>
              {topByPlays.length === 0 ? (
                <p className="text-xs text-text-3">Todavía no hay piezas publicadas con métricas sincronizadas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-divider text-left text-[10px] font-bold uppercase tracking-wide text-text-3">
                        <th className="w-6 px-1 py-2"></th>
                        <th className="px-2 py-2">Pieza</th>
                        <th className="px-2 py-2 text-right">Plays</th>
                        <th className="px-2 py-2 text-right">Alcance</th>
                        <th className="px-2 py-2 text-right">Likes</th>
                        <th className="px-2 py-2 text-right">Coment.</th>
                        <th className="px-2 py-2 text-right">Compart.</th>
                        <th className="px-2 py-2 text-right">Guard.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topByPlays.map((m) => {
                        const permalink = itemPermalink(m)
                        const format = itemFormat(m)
                        return (
                          <tr key={m.id} className="border-b border-divider last:border-0">
                            <td className="px-1 py-2">
                              <input
                                type="checkbox"
                                checked={selected.has(m.id)}
                                disabled={!selected.has(m.id) && selected.size >= MAX_COMPARE}
                                onChange={() => toggleSelected(m.id)}
                                title={!selected.has(m.id) && selected.size >= MAX_COMPARE ? `Podés comparar hasta ${MAX_COMPARE} a la vez.` : undefined}
                              />
                            </td>
                            <td className="min-w-0 px-2 py-2">
                              {permalink ? (
                                <a href={permalink} target="_blank" rel="noreferrer" className="truncate text-xs font-semibold text-text hover:text-accent">
                                  {itemTitle(m)}
                                </a>
                              ) : (
                                <span className="truncate text-xs font-semibold text-text">{itemTitle(m)}</span>
                              )}
                              {format && <span className="ml-1.5 text-[10px] text-text-3">{format}</span>}
                              {/* ID real de Instagram — prueba visible de que cada fila viene de un medio
                                  distinto (no una métrica de cuenta repetida). font-mono acá es intencional:
                                  es un identificador técnico, no una cifra financiera (esa regla es la que
                                  rige en Ventas), así que distinguir 0/O y 1/l importa más que el tabular-nums. */}
                              {m.ig_media_id && <span className="ml-1.5 font-mono text-[9px] text-text-3">#{m.ig_media_id.slice(-6)}</span>}
                            </td>
                            <td className="px-2 py-2 text-right text-xs font-semibold tabular-nums text-text">{fmt(m.plays)}</td>
                            <td className="px-2 py-2 text-right text-xs tabular-nums text-text-2">{fmt(m.reach)}</td>
                            <td className="px-2 py-2 text-right text-xs tabular-nums text-text-2">{fmt(m.likes)}</td>
                            <td className="px-2 py-2 text-right text-xs tabular-nums text-text-2">{fmt(m.comments)}</td>
                            <td className="px-2 py-2 text-right text-xs tabular-nums text-text-2">{fmt(m.shares)}</td>
                            <td className="px-2 py-2 text-right text-xs tabular-nums text-text-2">{fmt(m.saves)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ))}

      {comparing && selectedItems.length >= 2 && <ComparisonPanel items={selectedItems} onClose={() => setComparing(false)} />}

      {crossPostItem && <CrossPostModal item={crossPostItem} onClose={() => setCrossPostItem(null)} />}
    </div>
  )
}
