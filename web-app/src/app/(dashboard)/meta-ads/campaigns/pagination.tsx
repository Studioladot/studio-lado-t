'use client'

// Genera la lista de páginas a mostrar con elipsis, patrón clásico:
// 1 2 3 ... 8 9 10 (nunca más de ~7 elementos visibles).
function buildPageList(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)

  const result: (number | 'ellipsis')[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('ellipsis')
    result.push(p)
    prev = p
  }
  return result
}

const buttonBase =
  'flex h-8 min-w-8 items-center justify-center rounded-control px-2 text-[13px] font-medium outline-none transition-colors duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40'

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const pages = buildPageList(page, totalPages)

  return (
    <nav className="mt-4 flex items-center justify-center gap-1" aria-label="Paginación de campañas">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="Página anterior"
        className={`${buttonBase} text-text-2 hover:bg-surface-2 hover:text-text`}
      >
        ‹
      </button>
      {pages.map((p, index) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="flex h-8 min-w-8 items-center justify-center text-[13px] text-text-3">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`${buttonBase} ${
              p === page ? 'bg-primary text-white' : 'text-text-2 hover:bg-surface-2 hover:text-text'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Página siguiente"
        className={`${buttonBase} text-text-2 hover:bg-surface-2 hover:text-text`}
      >
        ›
      </button>
    </nav>
  )
}
