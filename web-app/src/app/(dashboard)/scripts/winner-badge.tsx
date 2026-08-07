// "Guión Ganador" (2026-08-07) — insignia cuando el anuncio nacido de este
// guion (library_creatives.deployed_ad_id) está en tier 'escalar' hoy en
// Meta (ver lib/meta/script-winners.ts). Verde porque reusa el mismo
// significado que ya tiene ese color en el resto de la app (ACTIVE,
// 'escalar') — no es un color nuevo, es el mismo semáforo aplicado acá.
function TrophyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4ZM7 4H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4M17 4h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
    </svg>
  )
}

export function WinnerBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-green/30 bg-green/[8%] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-green">
        <TrophyIcon size={10} />
        Ganador
      </span>
    )
  }

  return (
    <div className="mb-4 flex items-center gap-2.5 rounded-control border border-green/30 bg-green/[6%] px-3.5 py-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green/12 text-green">
        <TrophyIcon size={14} />
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-green">Guión Ganador</p>
        <p className="mt-0.5 text-xs font-medium text-text">El anuncio que nació de este guion está escalando en pauta ahora mismo.</p>
      </div>
    </div>
  )
}
