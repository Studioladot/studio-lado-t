import type { CreativePatternInsight } from '@/lib/meta/creative-patterns'

// "Análisis Visual Asistido" (2026-08-07) — mismo estilo visual que
// Diagnóstico Inteligente en Contenido (performance-tab.tsx): ícono +
// eyebrow + mensaje en un solo renglón, sin gráficos ni tabla — masticado
// para alguien que no tiene tiempo de leer un dashboard entero. Server
// Component puro (el cálculo ya viene resuelto de la página) — sin
// necesidad de useCurrency acá, el mensaje es en porcentaje, no en plata.
export function CreativePatternBanner({ insight }: { insight: CreativePatternInsight }) {
  return (
    <div className="mb-3.5 flex items-start gap-3 rounded-card border border-accent/25 bg-accent/4 p-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.55 1 1.3 1 2.1V16h6v-.4c0-.8.4-1.55 1-2.1A6 6 0 0 0 12 3Z" />
        </svg>
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-accent">Análisis visual asistido</p>
        <p className="mt-0.5 text-sm font-medium text-text">
          Tus anuncios con <span className="font-bold">&quot;{insight.bestToken}&quot;</span> en el nombre tienen un CPA{' '}
          {Math.round(insight.cpaDiffPct)}% más bajo que los que dicen <span className="font-bold">&quot;{insight.worstToken}&quot;</span>{' '}
          ({insight.bestSample} anuncio{insight.bestSample === 1 ? '' : 's'} vs {insight.worstSample}) — repetí ese patrón en tus
          próximos creativos.
        </p>
      </div>
    </div>
  )
}
