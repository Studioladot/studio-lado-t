import { formatLabel, interactionsTotal, primaryMetric, type InstagramCatalogRow } from '@/lib/instagram/media-catalog-winners'
import { InstagramIcon } from '@/components/features/nav-icons'

// Comparativa — panel frente a frente para 2 a 4 publicaciones del
// Catálogo Instagram (2026-08-06: resurrección de la vieja comparativa de
// la tabla de Rendimiento, ahora sobre InstagramCatalogRow en vez de
// MediaInsight — la grilla premium ya no usa esa tabla). Resalta en verde
// el valor más alto de cada fila — nunca un puntaje inventado, solo el
// máximo real de las columnas que la API efectivamente devolvió (null se
// trata como "sin dato", nunca como 0, para no hacerlo ganar por default).

type MetricRow = { key: 'views' | 'reach' | 'impressions' | 'likes' | 'comments' | 'shares' | 'saved' | 'interactions'; label: string }

const METRIC_ROWS: MetricRow[] = [
  { key: 'views', label: 'Vistas' },
  { key: 'reach', label: 'Alcance' },
  { key: 'impressions', label: 'Impresiones' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comentarios' },
  { key: 'shares', label: 'Compartidos' },
  { key: 'saved', label: 'Guardados' },
  { key: 'interactions', label: 'Interacciones' },
]

function fmt(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('es-AR')
}

/**
 * Diferencia porcentual contra la primera publicación seleccionada (la
 * "Base") — pedido explícito 2026-08-06: "+5% de likes", "-3% de
 * comentarios" comparando una pieza contra la otra. Null si no hay base
 * para comparar (falta el dato en la base, o la base es 0 — dividir por 0
 * no es un "-100%" real, es indefinido).
 */
function deltaPct(value: number | null, baseline: number | null): number | null {
  if (value === null || baseline === null || baseline === 0) return null
  return ((value - baseline) / baseline) * 100
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null || Math.abs(delta) < 0.5) return null
  const positive = delta > 0
  return (
    <span className={`text-[10px] font-semibold tabular-nums ${positive ? 'text-green' : 'text-red'}`}>
      {positive ? '+' : ''}
      {delta.toFixed(0)}%
    </span>
  )
}

function metricValue(item: InstagramCatalogRow, key: MetricRow['key']): number | null {
  switch (key) {
    case 'views':
      return primaryMetric(item)
    case 'reach':
      return item.reach
    case 'impressions':
      return item.impressions
    case 'likes':
      return item.like_count
    case 'comments':
      return item.comments_count
    case 'shares':
      return item.shares
    case 'saved':
      return item.saved
    case 'interactions':
      return interactionsTotal(item)
  }
}

export function ComparisonPanel({ items, onClose }: { items: InstagramCatalogRow[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-[800px] overflow-y-auto rounded-card border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
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
                <th className="w-24 px-2 py-2">Métrica</th>
                {items.map((item, i) => (
                  <th key={item.id} className="px-2 py-2">
                    <div className="flex flex-col gap-1.5">
                      {i === 0 && (
                        <span className="w-fit rounded-full bg-surface-2 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-text-3">
                          Base
                        </span>
                      )}
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-control bg-black">
                        {item.thumbnail_url || item.media_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- thumbnail remoto de Instagram, no un asset local.
                          <img src={item.thumbnail_url ?? item.media_url ?? undefined} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-text-3">
                            <InstagramIcon size={16} />
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-text-3">{formatLabel(item)}</span>
                      {item.permalink ? (
                        <a
                          href={item.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-2 max-w-[120px] font-medium normal-case text-text hover:text-accent"
                        >
                          {item.caption || 'Sin descripción'}
                        </a>
                      ) : (
                        <span className="line-clamp-2 max-w-[120px] font-medium normal-case text-text">{item.caption || 'Sin descripción'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((row) => {
                const values = items.map((item) => metricValue(item, row.key))
                const max = values.every((v) => v === null) ? null : Math.max(...values.filter((v): v is number => v !== null))
                const baseline = values[0]
                return (
                  <tr key={row.key} className="border-t border-divider">
                    <td className="px-2 py-2 font-medium text-text-2">{row.label}</td>
                    {values.map((v, i) => (
                      <td key={i} className={`px-2 py-2 tabular-nums ${v !== null && v === max ? 'font-bold text-green' : 'text-text'}`}>
                        <div className="flex items-center gap-1.5">
                          <span>{fmt(v)}</span>
                          {i > 0 && <DeltaBadge delta={deltaPct(v, baseline)} />}
                        </div>
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
