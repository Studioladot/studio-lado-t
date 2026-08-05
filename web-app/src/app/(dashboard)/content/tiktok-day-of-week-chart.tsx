'use client'

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { computeDayOfWeekPerformance, bestDayInsight, type DayOfWeekPoint } from '@/lib/tiktok/day-of-week-performance'
import type { TiktokVideoRow } from '@/lib/tiktok/winners'

function InsightIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2a5 5 0 0 0-2.8 9.1c.5.35.8.9.8 1.5v.4h4v-.4c0-.6.3-1.15.8-1.5A5 5 0 0 0 9 2Z" />
      <path d="M7 15.5h4M7.5 17h3" />
    </svg>
  )
}

type ChartRow = { day: string; Interacciones: number; Vistas: number; rawInteractions: number | null; rawViews: number | null }

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
          <span className="text-text-2">Vistas</span>
          <span className="ml-auto font-semibold tabular-nums text-text">
            {point.rawViews !== null ? Math.round(point.rawViews).toLocaleString('es-AR') : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

// Puerto directo de instagram-day-of-week-chart.tsx (Paridad de
// Plataformas, 2026-08-06) — mismo criterio de normalización a % del
// propio máximo (interacciones y vistas tienen magnitudes muy distintas,
// un solo eje radial compartido).
export function TiktokDayOfWeekChart({ videos }: { videos: TiktokVideoRow[] }) {
  const points = computeDayOfWeekPerformance(videos)
  const daysWithData = points.filter((p) => p.avgInteractions !== null || p.avgViews !== null).length

  if (daysWithData < 3) {
    return (
      <div className="rounded-card border border-border bg-surface p-5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Interacciones por día de la semana</p>
        <p className="mt-6 text-center text-xs text-text-3">
          Todavía no hay suficientes videos repartidos en distintos días de la semana para graficar esto.
        </p>
      </div>
    )
  }

  const maxInteractions = Math.max(1, ...points.map((p) => p.avgInteractions ?? 0))
  const maxViews = Math.max(1, ...points.map((p) => p.avgViews ?? 0))

  const chartData: ChartRow[] = points.map((p: DayOfWeekPoint) => ({
    day: p.day,
    Interacciones: p.avgInteractions !== null ? Math.round((p.avgInteractions / maxInteractions) * 100) : 0,
    Vistas: p.avgViews !== null ? Math.round((p.avgViews / maxViews) * 100) : 0,
    rawInteractions: p.avgInteractions,
    rawViews: p.avgViews,
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
            <span className="h-2 w-2 rounded-full bg-amber" /> Vistas
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
            <Radar name="Vistas" dataKey="Vistas" stroke="var(--amber)" fill="var(--amber)" fillOpacity={0.12} strokeWidth={2} strokeDasharray="4 3" />
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
