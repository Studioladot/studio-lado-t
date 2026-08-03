'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ProfileGrowthPoint } from '@/lib/instagram/account-overview'

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-control border border-border-2 bg-surface px-3 py-2 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
      <p className="mb-1 font-semibold text-text">{label ? shortDate(label) : ''}</p>
      <div className="flex items-center gap-2">
        <span className="h-[2px] w-3 shrink-0 rounded-full bg-accent" />
        <span className="text-text-2">Crecimiento acumulado</span>
        <span className="ml-auto font-semibold tabular-nums text-text">
          {payload[0].value > 0 ? '+' : ''}
          {payload[0].value.toLocaleString('es-AR')}
        </span>
      </div>
    </div>
  )
}

// "Crecimiento de Perfil" — Nivel 1 del panel de Analítica Avanzada.
// follower_count es el delta neto DIARIO que reporta la Graph API, no un
// acumulado — acá se muestra la curva de crecimiento acumulado dentro del
// período visible (no la cifra absoluta de seguidores de la cuenta), rótulo
// explícito para que no se confunda con el total. Una sola serie: sin
// leyenda (el título ya dice qué se está viendo).
export function ProfileGrowthChart({ data }: { data: ProfileGrowthPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="rounded-card border border-border bg-surface p-5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Crecimiento de perfil</p>
        <p className="mt-6 text-center text-xs text-text-3">Todavía no hay suficientes días de datos sincronizados.</p>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Crecimiento de perfil</p>
        <p className="mt-0.5 text-[11px] text-text-3">Seguidores netos acumulados en el período</p>
      </div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="profileGrowthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
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
            <Area
              type="monotone"
              dataKey="crecimientoAcumulado"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#profileGrowthFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
