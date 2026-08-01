'use client'

// Filtro de búsqueda + estado para Conjuntos y Anuncios dentro del detalle de
// campaña — mismas píldoras/estilos que CampaignsFilters (../campaigns-filters.tsx),
// pero controlado y en memoria: acá los datos ya están cargados completos de
// una sola vez (no hay searchParams/route por nivel), así que filtrar no debe
// disparar una navegación ni un refetch a la Graph API.

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Activas' },
  { value: 'paused', label: 'Pausadas' },
  { value: 'other', label: 'Otras' },
]

const inputClass =
  'rounded-control border border-border bg-surface px-2.5 py-1.5 text-[13px] text-text outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent'

const pillGroupClass = 'inline-flex flex-wrap gap-0.5 rounded-control border border-border p-0.5'
function pillClass(active: boolean) {
  return `whitespace-nowrap rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
    active ? 'bg-primary text-white' : 'text-text-2 hover:text-text'
  }`
}

export function EntityStatusFilter({
  query,
  status,
  onQueryChange,
  onStatusChange,
  searchPlaceholder,
}: {
  query: string
  status: string
  onQueryChange: (value: string) => void
  onStatusChange: (value: string) => void
  searchPlaceholder: string
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={searchPlaceholder}
        className={`${inputClass} w-full max-w-[220px]`}
      />
      <div className={pillGroupClass}>
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={status === option.value}
            onClick={() => onStatusChange(option.value)}
            className={pillClass(status === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
