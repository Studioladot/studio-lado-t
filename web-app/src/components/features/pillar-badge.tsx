// "Pilares Estratégicos" — badge compartido (2026-08-07). Regla de diseño
// explícita: cero íconos/emojis, la jerarquía se resuelve solo con color de
// fondo neutro, borde fino y peso tipográfico — nunca un color por pilar
// (ni acento ni un hash de colores), para que el pilar "Venta" no compita
// visualmente con el semáforo real de rendimiento (verde/ámbar/rojo) que
// ya usan Campañas en otro lado. Mismo componente en Publicaciones
// (Calendario), Campañas (lista) y Notas (tarjetas).
export function PillarBadge({ pillar, className = '' }: { pillar: string; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-text-2 ${className}`}
    >
      {pillar}
    </span>
  )
}
