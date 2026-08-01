import type { Database } from '@/lib/types/database.types'

type AccountInsight = Database['public']['Tables']['instagram_account_insights']['Row']

// Cruce de seguidores vs. alcance diario — lo que pidió la PO ("cruzarlo con
// los picos de nuevos seguidores"). Barras (alcance) + línea (seguidores),
// mismo criterio hand-rolled sin librería que daily-revenue-chart.tsx y
// sparkline.tsx. Cada serie usa SU PROPIA escala (min/max independiente) —
// es un gráfico de correlación temporal, no de magnitud comparable, así que
// forzar un solo eje sería engañoso.

const WIDTH = 100
const HEIGHT = 140

export function AccountTrendChart({ data }: { data: AccountInsight[] }) {
  const withReach = data.filter((d) => d.reach !== null)
  const withFollowers = data.filter((d) => d.follower_count !== null)

  if (data.length < 2) {
    return (
      <div className="rounded-card border border-border bg-surface p-5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Seguidores vs. Alcance diario</p>
        <p className="mt-6 text-center text-xs text-text-3">Todavía no hay suficientes días de datos sincronizados.</p>
      </div>
    )
  }

  const reachMax = Math.max(...withReach.map((d) => d.reach!), 1)
  const followerValues = withFollowers.map((d) => d.follower_count!)
  const followerMin = Math.min(...followerValues)
  const followerMax = Math.max(...followerValues, followerMin + 1)

  const stepX = WIDTH / (data.length - 1)
  const linePoints = withFollowers.map((d) => {
    const i = data.indexOf(d)
    const x = i * stepX
    const y = HEIGHT - ((d.follower_count! - followerMin) / (followerMax - followerMin)) * HEIGHT
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Seguidores vs. Alcance diario</p>
        <div className="flex items-center gap-3 text-[10px] text-text-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-accent/30" /> Alcance
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-2.5 rounded-full bg-green" /> Seguidores
          </span>
        </div>
      </div>

      <div className="relative h-[140px]">
        <div className="absolute inset-0 flex items-end gap-[1px]">
          {data.map((d) => (
            <div key={d.captured_at} className="group relative h-full flex-1">
              {d.reach !== null && (
                <div className="absolute bottom-0 w-full rounded-t-sm bg-accent/25" style={{ height: `${(d.reach / reachMax) * 100}%` }} />
              )}
              <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-control border border-border-2 bg-surface px-2 py-1 text-[10px] text-text group-hover:block">
                {d.captured_at} — {d.reach !== null ? `${d.reach.toLocaleString('es-AR')} alcance` : 'sin dato'}
                {d.follower_count !== null ? ` · ${d.follower_count.toLocaleString('es-AR')} seguidores` : ''}
              </div>
            </div>
          ))}
        </div>

        {linePoints.length >= 2 && (
          <svg className="pointer-events-none absolute inset-0" width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
            <polyline points={linePoints.join(' ')} fill="none" stroke="var(--green)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </div>

      <div className="mt-2 flex justify-between text-[9px] text-text-3">
        <span>{data[0].captured_at}</span>
        {data.length > 1 && <span>{data[data.length - 1].captured_at}</span>}
      </div>
    </div>
  )
}
