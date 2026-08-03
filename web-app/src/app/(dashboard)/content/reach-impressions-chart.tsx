'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ReachImpressionsPoint } from '@/lib/instagram/account-overview'

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-control border border-border-2 bg-surface px-3 py-2 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
      <p className="mb-1.5 font-semibold text-text">{label ? shortDate(label) : ''}</p>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="h-[2px] w-3 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-text-2">{entry.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-text">{entry.value.toLocaleString('es-AR')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// "Alcance e Impresiones en el tiempo" — Nivel 1 del panel de Analítica
// Avanzada. Un solo eje Y: alcance e impresiones son la misma unidad
// (personas/vistas) y de magnitud comparable, así que un eje dual sería
// engañoso, no informativo.
export function ReachImpressionsChart({ data }: { data: ReachImpressionsPoint[] }) {
  const hasReach = data.some((d) => d.reach !== null)
  const hasImpressions = data.some((d) => d.impressions !== null)

  if (data.length < 2 || (!hasReach && !hasImpressions)) {
    return (
      <div className="rounded-card border border-border bg-surface p-5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Alcance e impresiones en el tiempo</p>
        <p className="mt-6 text-center text-xs text-text-3">Todavía no hay suficientes días de datos sincronizados.</p>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Alcance e impresiones en el tiempo</p>
        <div className="flex items-center gap-3 text-[10px] text-text-3">
          {hasReach && (
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-3 rounded-full bg-accent" /> Alcance
            </span>
          )}
          {hasImpressions && (
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-3 border-t-2 border-dashed border-amber" /> Impresiones
            </span>
          )}
        </div>
      </div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--divider)" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fill: 'var(--text-3)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: 'var(--text-3)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v: number) => v.toLocaleString('es-AR')}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-2)', strokeWidth: 1 }} />
            {hasReach && (
              <Line
                type="monotone"
                dataKey="reach"
                name="Alcance"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
                connectNulls
              />
            )}
            {hasImpressions && (
              <Line
                type="monotone"
                dataKey="impressions"
                name="Impresiones"
                stroke="var(--amber)"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
