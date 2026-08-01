import type { Insight } from '@/lib/tiendanube/insights'

const TONE_CLASS: Record<Insight['tone'], string> = {
  ok: 'border-green/25 bg-green/[0.05] text-green',
  warn: 'border-amber/25 bg-amber/[0.05] text-amber',
  alert: 'border-red/25 bg-red/[0.05] text-red',
}

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Insights Automáticos</p>
      <ul className="flex flex-col gap-2">
        {insights.map((insight, i) => (
          <li key={i} className={`rounded-control border px-3.5 py-2.5 text-xs leading-relaxed ${TONE_CLASS[insight.tone]}`}>
            {insight.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
