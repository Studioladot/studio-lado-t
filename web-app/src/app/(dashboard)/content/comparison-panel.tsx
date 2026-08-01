import type { MediaInsight } from './content-tabs'

// Comparativa — panel frente a frente para 2+ piezas/publicaciones
// seleccionadas en la tabla de Rendimiento. Resalta en verde el valor más
// alto de cada fila — nunca un puntaje inventado, solo el máximo real de
// las columnas que la API efectivamente devolvió (null se trata como "sin
// dato", nunca como 0, para no hacerlo ganar por default).

type MetricRow = { key: keyof MediaInsight | 'interactions'; label: string }

const METRIC_ROWS: MetricRow[] = [
  { key: 'plays', label: 'Reproducciones' },
  { key: 'reach', label: 'Alcance' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comentarios' },
  { key: 'shares', label: 'Compartidos' },
  { key: 'saves', label: 'Guardados' },
  { key: 'interactions', label: 'Interacciones' },
]

function fmt(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('es-AR')
}

function itemTitle(m: MediaInsight): string {
  return m.content_piezas?.titulo ?? m.content_posts?.title ?? 'Sin título'
}

function itemPermalink(m: MediaInsight): string | null {
  return m.content_piezas?.ig_permalink ?? m.content_posts?.ig_permalink ?? null
}

/** likes+comments+shares+saves — no es un campo que la Graph API devuelva como tal en Media Insights v19, se calcula acá. Si falta algún componente, el total queda null en vez de subestimar. */
function interactions(m: MediaInsight): number | null {
  const parts = [m.likes, m.comments, m.shares, m.saves]
  if (parts.some((p) => p === null)) return null
  return parts.reduce((sum: number, p) => sum + (p ?? 0), 0)
}

function metricValue(m: MediaInsight, key: MetricRow['key']): number | null {
  if (key === 'interactions') return interactions(m)
  const value = m[key]
  return typeof value === 'number' ? value : null
}

export function ComparisonPanel({ items, onClose }: { items: MediaInsight[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-[720px] overflow-y-auto rounded-card border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold text-text">Comparativa</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-control text-text-3 transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-text-3">
                <th className="px-2 py-2">Métrica</th>
                {items.map((m) => (
                  <th key={m.id} className="px-2 py-2">
                    {itemPermalink(m) ? (
                      <a href={itemPermalink(m)!} target="_blank" rel="noreferrer" className="block text-text hover:text-accent">
                        {itemTitle(m)}
                      </a>
                    ) : (
                      <span className="block text-text">{itemTitle(m)}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((row) => {
                const values = items.map((m) => metricValue(m, row.key))
                const max = values.every((v) => v === null) ? null : Math.max(...values.filter((v): v is number => v !== null))
                return (
                  <tr key={row.key} className="border-t border-divider">
                    <td className="px-2 py-2 font-medium text-text-2">{row.label}</td>
                    {values.map((v, i) => (
                      <td key={i} className={`px-2 py-2 tabular-nums ${v !== null && v === max ? 'font-bold text-green' : 'text-text'}`}>
                        {fmt(v)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
