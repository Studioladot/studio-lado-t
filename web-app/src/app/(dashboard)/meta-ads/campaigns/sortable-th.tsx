'use client'

// Encabezado de tabla ordenable, compartido por Campañas/Conjuntos/Anuncios
// (2026-07-27) — mismo criterio que metric-defs.tsx: un solo componente, no
// una versión por tabla. Primer clic ordena de mayor a menor (desc); un
// segundo clic sobre la misma columna invierte a asc. La flecha queda tenue
// en las columnas no activas para no saturar el header con 8+ íconos.

export type SortDirection = 'asc' | 'desc'

function SortIcon({ direction, active }: { direction: SortDirection; active: boolean }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-all duration-150 ease-out ${active ? 'opacity-100' : 'opacity-30'} ${
        direction === 'asc' ? 'rotate-180' : ''
      }`}
    >
      <path d="M2 3.5L5 6.5L8 3.5" />
    </svg>
  )
}

export function SortableTh<K extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = 'center',
}: {
  label: string
  sortKey: K
  activeKey: K | null
  direction: SortDirection
  onSort: (key: K) => void
  align?: 'left' | 'center'
}) {
  const active = activeKey === sortKey

  return (
    <th className={`whitespace-nowrap px-5 py-1.5 ${align === 'center' ? 'text-center' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 outline-none transition-colors duration-150 ease-out hover:text-text focus-visible:text-text ${
          active ? 'text-text' : ''
        }`}
      >
        {label}
        <SortIcon direction={active ? direction : 'desc'} active={active} />
      </button>
    </th>
  )
}
