'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CrossPostModal } from './cross-post-modal'
import { TiktokPerformanceSection } from './tiktok-performance-section'
import { InstagramMediaCatalogSection } from './instagram-media-catalog-section'
import { InstagramSyncControl } from './instagram-sync-control'
import { InstagramOverviewKpis } from './instagram-overview-kpis'
import { ReachImpressionsChart } from './reach-impressions-chart'
import { ProfileGrowthChart } from './profile-growth-chart'
import { DateRangePicker } from './instagram-date-range-picker'
import type { AccountInsight } from './content-tabs'
import type { WinningItem } from '@/lib/content/winners'
import type { TiktokVideoRow } from '@/lib/tiktok/winners'
import type { InstagramCatalogRow } from '@/lib/instagram/media-catalog-winners'
import { computeAccountOverviewKpis, buildReachImpressionsSeries, buildProfileGrowthSeries } from '@/lib/instagram/account-overview'
import { DATE_RANGE_OPTIONS, filterByDateRange, type DateRangeMode } from '@/lib/instagram/date-range'

// "Rendimiento" — analítica orgánica de Instagram, alimentada por los
// snapshots cacheados en instagram_account_insights/instagram_media_catalog.
// Hasta 2026-08-06 esos snapshots solo los escribía el cron diario de
// instagram-metrics-sync; ahora InstagramSyncControl puede además disparar
// un fetch en vivo bajo demanda (syncInstagramAccountInsightsAction +
// syncInstagramMediaAction) para que una cuenta recién conectada no tenga
// que esperar hasta 24hs para ver su primer dato — sigue siendo lectura
// desde caché en cada render, el fetch en vivo solo ocurre en el momento
// puntual del sync. Mismo tratamiento premium que Ventas: metric-card con
// delta+tabular-nums para los KPIs, grilla densa para el catálogo.
//
// La vieja tabla "Piezas y publicaciones por reproducciones" (con su
// selección para comparar) se sacó acá el 2026-08-06 — quedaba vacía para
// cualquier cuenta sin piezas de campaña publicadas por Gotix, redundante
// con la grilla premium de instagram_media_catalog de más abajo, que
// cubre el mismo propósito con datos reales de entrada "zero fricción".

export function PerformanceTab({
  instagramConnected,
  igUsername,
  accountInsights,
  winningItems,
  tiktokConnected,
  tiktokVideos,
  instagramCatalog,
  gotixMediaIds,
}: {
  instagramConnected: boolean
  igUsername: string | null
  accountInsights: AccountInsight[]
  winningItems: WinningItem[]
  tiktokConnected: boolean
  tiktokVideos: TiktokVideoRow[]
  instagramCatalog: InstagramCatalogRow[]
  gotixMediaIds: Set<string>
}) {
  const [crossPostItem, setCrossPostItem] = useState<WinningItem | null>(null)
  // Único selector de rango de fechas de toda la sección (2026-08-06) —
  // filtra tanto los KPIs/gráficos de cuenta como la grilla de contenido,
  // nunca dos controles de fecha independientes en la misma pantalla.
  const [dateRange, setDateRange] = useState<DateRangeMode>('30d')
  // Rediseño (2026-08-01): con las dos redes conectadas, antes se
  // apilaban verticalmente — separadas en sub-tabs para navegar en
  // entornos aislados. Si solo hay una red conectada, no tiene sentido
  // mostrar un toggle de una sola opción — se salta directo a esa sección.
  // Instagram va primero por default (pedido explícito 2026-08-06) — antes
  // priorizaba TikTok cuando las dos estaban conectadas.
  const [networkTab, setNetworkTab] = useState<'tiktok' | 'meta'>('meta')
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

  // Nivel 1 — Visión Global de la Cuenta (2026-08-06): KPIs y series
  // agregadas sobre el rango elegido en el DateRangePicker de arriba,
  // recortado sobre los hasta 90 días que ya trae accountInsights desde
  // content/page.tsx (server-side). "Todo el historial" muestra lo que
  // haya llegado a sincronizarse — no hay más que eso para mostrar.
  const filteredAccountInsights = filterByDateRange(accountInsights, dateRange, (d) => d.captured_at)
  const overviewKpis = computeAccountOverviewKpis(filteredAccountInsights)
  const reachImpressionsSeries = buildReachImpressionsSeries(filteredAccountInsights)
  const profileGrowthSeries = buildProfileGrowthSeries(filteredAccountInsights)
  const periodLabel = DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label.toLowerCase() ?? 'período elegido'

  // Mismo rango para la grilla de contenido — instagramCatalog llega sin
  // acotar desde content/page.tsx (todo el historial sincronizado).
  // hasSyncedAny usa el array SIN filtrar: "no hay nada en este rango" y
  // "nunca sincronizaste" son estados distintos, la grilla necesita
  // distinguirlos para mostrar el mensaje correcto.
  const filteredInstagramCatalog = filterByDateRange(instagramCatalog, dateRange, (c) => c.posted_at)

  return (
    <div className="flex flex-col gap-4">
      {showNetworkTabs && (
        <div className="flex w-fit gap-1 rounded-control border border-border bg-surface-2/40 p-1">
          <button
            type="button"
            onClick={() => setNetworkTab('meta')}
            className={`rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
              networkTab === 'meta' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
            }`}
          >
            Rendimiento Instagram
          </button>
          <button
            type="button"
            onClick={() => setNetworkTab('tiktok')}
            className={`rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
              networkTab === 'tiktok' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
            }`}
          >
            Rendimiento TikTok
          </button>
        </div>
      )}

      {tiktokConnected && (!showNetworkTabs || networkTab === 'tiktok') && <TiktokPerformanceSection videos={tiktokVideos} />}

      {instagramConnected && (!showNetworkTabs || networkTab === 'meta') && (
        <>
          {/* Jerarquía Nivel 1 (2026-08-06, "real-time feel"): handle +
              control de sync arriba de todo, después los 4 KPIs, después
              los gráficos de evolución, y la grilla de publicaciones al
              fondo. Se renderiza siempre que Instagram esté conectado, sin
              importar si accountInsights/instagramCatalog ya tienen datos
              sincronizados — cada pieza sabe mostrar su propio estado
              vacío (KPI en "—", gráfico con su mensaje), ocultar el bloque
              entero detrás de un solo gate dejaba el panel en blanco para
              cualquier cuenta recién conectada (bug reportado 2026-08-06). */}
          <div className="flex items-center justify-between gap-2">
            <InstagramSyncControl igUsername={igUsername} hasAccountData={accountInsights.length > 0} />
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>

          <InstagramOverviewKpis kpis={overviewKpis} periodLabel={periodLabel} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ReachImpressionsChart data={reachImpressionsSeries} />
            <ProfileGrowthChart data={profileGrowthSeries} />
          </div>

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

          {/* Grilla de publicaciones — al fondo de la jerarquía a
              propósito (pedido explícito 2026-08-06): es la sección más
              densa/exploratoria, viene después de los KPIs y gráficos de
              resumen. Independiente del cron diario de instagram-metrics-
              sync que alimenta accountInsights arriba: se sincroniza
              manual, a demanda, así que tiene que verse aunque el cron
              todavía no haya corrido. */}
          <InstagramMediaCatalogSection items={filteredInstagramCatalog} hasSyncedAny={instagramCatalog.length > 0} gotixMediaIds={gotixMediaIds} />
        </>
      )}

      {crossPostItem && <CrossPostModal item={crossPostItem} onClose={() => setCrossPostItem(null)} />}
    </div>
  )
}
