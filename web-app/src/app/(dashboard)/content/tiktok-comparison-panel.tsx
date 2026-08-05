'use client'

import { useEffect } from 'react'
import { interactionsTotal, type TiktokVideoRow } from '@/lib/tiktok/winners'
import { TiktokIcon } from '@/components/features/nav-icons'

// Puerto directo de comparison-panel.tsx (Instagram) — Paridad de
// Plataformas, 2026-08-06. TikTok no tiene reach/impressions/saved
// separados, así que son menos filas (Vistas/Likes/Comentarios/
// Compartidos/Interacciones), pero mismo mecanismo: primera columna
// seleccionada = "Base", el resto muestra el delta % contra ella.

type MetricRow = { key: 'views' | 'likes' | 'comments' | 'shares' | 'interactions'; label: string }

const METRIC_ROWS: MetricRow[] = [
  { key: 'views', label: 'Vistas' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comentarios' },
  { key: 'shares', label: 'Compartidos' },
  { key: 'interactions', label: 'Interacciones' },
]

function fmt(n: number): string {
  return n.toLocaleString('es-AR')
}

function deltaPct(value: number, baseline: number): number | null {
  if (baseline === 0) return null
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

function metricValue(video: TiktokVideoRow, key: MetricRow['key']): number {
  switch (key) {
    case 'views':
      return video.view_count
    case 'likes':
      return video.like_count
    case 'comments':
      return video.comment_count
    case 'shares':
      return video.share_count
    case 'interactions':
      return interactionsTotal(video)
  }
}

export function TiktokComparisonPanel({ videos, onClose }: { videos: TiktokVideoRow[]; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
                {videos.map((video, i) => (
                  <th key={video.id} className="px-2 py-2">
                    <div className="flex flex-col gap-1.5">
                      {i === 0 && (
                        <span className="w-fit rounded-full bg-surface-2 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-text-3">
                          Base
                        </span>
                      )}
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-control bg-black">
                        {video.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- thumbnail remoto de TikTok, no un asset local.
                          <img src={video.cover_image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-text-3">
                            <TiktokIcon size={16} />
                          </div>
                        )}
                      </div>
                      {video.share_url ? (
                        <a
                          href={video.share_url}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-2 max-w-[120px] font-medium normal-case text-text hover:text-accent"
                        >
                          {video.description || 'Sin descripción'}
                        </a>
                      ) : (
                        <span className="line-clamp-2 max-w-[120px] font-medium normal-case text-text">{video.description || 'Sin descripción'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((row) => {
                const values = videos.map((video) => metricValue(video, row.key))
                const max = Math.max(...values)
                const baseline = values[0]
                return (
                  <tr key={row.key} className="border-t border-divider">
                    <td className="px-2 py-2 font-medium text-text-2">{row.label}</td>
                    {values.map((v, i) => (
                      <td key={i} className={`px-2 py-2 tabular-nums ${v === max ? 'font-bold text-green' : 'text-text'}`}>
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
