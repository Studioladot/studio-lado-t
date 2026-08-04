'use client'

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { computeDayOfWeekPerformance, bestDayInsight, type DayOfWeekPoint } from '@/lib/instagram/day-of-week-performance'
import type { InstagramCatalogRow } from '@/lib/instagram/media-catalog-winners'

function InsightIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2a5 5 0 0 0-2.8 9.1c.5.35.8.9.8 1.5v.4h4v-.4c0-.6.3-1.15.8-1.5A5 5 0 0 0 9 2Z" />
      <path d="M7 15.5h4M7.5 17h3" />
    </svg>
  )
}

type ChartRow = { day: string; Interacciones: number; Impresiones: number; rawInteractions: number | null; rawImpressions: number | null }

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartRow }[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-control border border-border-2 bg-surface px-3 py-2 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
      <p className="mb-1.5 font-semibold text-text">{point.day}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-[2px] w-3 shrink-0 rounded-full bg-accent" />
          <span className="text-text-2">Interacciones</span>
          <span className="ml-auto font-semibold tabular-nums text-text">
            {point.rawInteractions !== null ? Math.round(point.rawInteractions).toLocaleString('es-AR') : '—'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-[2px] w-3 shrink-0 rounded-full bg-amber" />
          <span className="text-text-2">Impresiones</span>
          <span className="ml-auto font-semibold tabular-nums text-text">
            {point.rawImpressions !== null ? Math.round(point.rawImpressions).toLocaleString('es-AR') : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

// "Interacciones por Día de la Semana" (2026-08-06) — spider chart sobre el
// promedio de interacciones/impresiones por publicación, agrupado por día
// calendario de publicación. Interacciones e impresiones tienen magnitudes
// muy distintas (impresiones suele ser 10-100x más grande) — graficarlas
// crudas en el mismo eje radial dejaría "Interacciones" invisible pegado al
// centro. Se normaliza cada serie a % de SU PROPIO máximo (0-100) antes de
// graficar, un solo eje radial compartido (0-100%), mismo criterio de "un
// solo eje" que ya usa ReachImpressionsChart — el tooltip muestra los
// valores crudos reales, la normalización es solo para que las dos formas
// se puedan comparar visualmente en el mismo radar.
export function InstagramDayOfWeekChart({ items }: { items: InstagramCatalogRow[] }) {
  const points = computeDayOfWeekPerformance(items)
  const daysWithData = points.filter((p) => p.avgInteractions !== null || p.avgImpressions !== null).length

  if (daysWithData < 3) {
    return (
      <div className="rounded-card border border-border bg-surface p-5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Interacciones por día de la semana</p>
        <p className="mt-6 text-center text-xs text-text-3">
          Todavía no hay suficientes publicaciones repartidas en distintos días de la semana para graficar esto.
        </p>
      </div>
    )
  }

  const maxInteractions = Math.max(1, ...points.map((p) => p.avgInteractions ?? 0))
  const maxImpressions = Math.max(1, ...points.map((p) => p.avgImpressions ?? 0))

  const chartData: ChartRow[] = points.map((p: DayOfWeekPoint) => ({
    day: p.day,
    Interacciones: p.avgInteractions !== null ? Math.round((p.avgInteractions / maxInteractions) * 100) : 0,
    Impresiones: p.avgImpressions !== null ? Math.round((p.avgImpressions / maxImpressions) * 100) : 0,
    rawInteractions: p.avgInteractions,
    rawImpressions: p.avgImpressions,
  }))

  const insight = bestDayInsight(points)

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Interacciones por día de la semana</p>
        <div className="flex items-center gap-3 text-[10px] text-text-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" /> Interacciones
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber" /> Impresiones
          </span>
        </div>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} outerRadius="72%">
            <PolarGrid stroke="var(--divider)" />
            <PolarAngleAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 10 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="Interacciones" dataKey="Interacciones" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.25} strokeWidth={2} />
            <Radar name="Impresiones" dataKey="Impresiones" stroke="var(--amber)" fill="var(--amber)" fillOpacity={0.12} strokeWidth={2} strokeDasharray="4 3" />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {insight && (
        <div className="mt-3 flex items-center gap-2 rounded-control border border-accent/30 bg-accent/[0.06] px-3 py-2 text-xs font-medium text-text">
          <span className="shrink-0 text-accent">
            <InsightIcon />
          </span>
          {insight}
        </div>
      )}
    </div>
  )
}
