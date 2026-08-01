'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { syncTiktokVideosAction } from './tiktok-sync-actions'
import { crossPostTiktokVideoAction } from './tiktok-cross-post-actions'
import { detectTiktokWinners, type TiktokVideoRow } from '@/lib/tiktok/winners'
import { TiktokIcon } from '@/components/features/nav-icons'

function fmt(n: number): string {
  return n.toLocaleString('es-AR')
}

// Sección "Rendimiento TikTok" (Fase 1 del Hub Omnicanal, 2026-08-01) —
// vive dentro de la pestaña Rendimiento existente, al lado (no en
// reemplazo) de la de Instagram. Catálogo real de la cuenta conectada
// (tiktok_videos), no contenido publicado por Gotix — por eso "Viral" se
// calcula por promedio de la cuenta (detectTiktokWinners) y no por
// crecimiento en el tiempo como el resto de "Ganadores".
export function TiktokPerformanceSection({ videos }: { videos: TiktokVideoRow[] }) {
  const [syncing, startSync] = useTransition()
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [crossPostingId, setCrossPostingId] = useState<string | null>(null)
  const [crossPostResult, setCrossPostResult] = useState<{ videoId: string; ok: boolean; message: string; postId?: string } | null>(null)

  const winners = detectTiktokWinners(videos)
  const sorted = [...videos].sort((a, b) => b.view_count - a.view_count)

  function handleSync() {
    setSyncError(null)
    setSyncMessage(null)
    startSync(async () => {
      const result = await syncTiktokVideosAction()
      if (!result.ok) {
        setSyncError(result.error)
        return
      }
      setSyncMessage(result.count === 0 ? 'No encontramos videos nuevos.' : `Sincronizados ${result.count} videos.`)
    })
  }

  async function handleEscalate(videoId: string) {
    setCrossPostingId(videoId)
    setCrossPostResult(null)
    const result = await crossPostTiktokVideoAction(videoId)
    setCrossPostingId(null)
    if (!result.ok) {
      setCrossPostResult({ videoId, ok: false, message: result.error })
      return
    }
    setCrossPostResult({
      videoId,
      ok: true,
      postId: result.newPostId,
      message: result.hasMedia
        ? 'Borrador creado en Publicaciones, listo para programar.'
        : 'Borrador creado — TikTok no nos dejó traer el archivo automáticamente, subilo a mano desde Publicaciones.',
    })
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TiktokIcon size={16} />
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Rendimiento TikTok</p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="rounded-control border border-border px-3 py-1.5 text-[11px] font-semibold text-text-2 transition-all duration-200 ease-out hover:border-text-3 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
      </div>

      {syncError && <p className="mb-3 text-xs text-red">{syncError}</p>}
      {syncMessage && <p className="mb-3 text-xs text-green">{syncMessage}</p>}

      {sorted.length === 0 ? (
        <p className="text-xs text-text-3">Todavía no sincronizaste tu historial de TikTok — tocá &ldquo;Sincronizar ahora&rdquo;.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((v) => {
            const isWinner = winners.has(v.id)
            const busy = crossPostingId === v.id
            const result = crossPostResult?.videoId === v.id ? crossPostResult : null
            return (
              <div key={v.id} className="flex flex-col overflow-hidden rounded-control border border-border bg-surface-2/40">
                <div className="relative aspect-[9/16] w-full bg-black">
                  {v.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- thumbnail remoto de TikTok, no un asset local.
                    <img src={v.cover_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-text-3">
                      <TiktokIcon size={24} />
                    </div>
                  )}
                  {isWinner && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow">
                      Viral
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                  <p className="line-clamp-2 text-[11px] text-text-2">{v.description || 'Sin descripción'}</p>
                  <div className="mt-auto flex items-center justify-between text-[10px] text-text-3">
                    <span className="font-semibold tabular-nums text-text">{fmt(v.view_count)} vistas</span>
                    {v.share_url && (
                      <a href={v.share_url} target="_blank" rel="noreferrer" className="hover:text-accent">
                        Ver en TikTok →
                      </a>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[9px] tabular-nums text-text-3">
                    <span>{fmt(v.like_count)} likes</span>
                    <span>{fmt(v.comment_count)} com.</span>
                    <span>{fmt(v.share_count)} comp.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEscalate(v.id)}
                    disabled={busy}
                    className="mt-1 rounded-control border border-accent/30 bg-accent/[0.06] px-2 py-1.5 text-[10px] font-semibold text-accent transition-all duration-200 ease-out hover:bg-accent/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? 'Escalando…' : 'Escalar a Instagram'}
                  </button>
                  {result && (
                    <p className={`text-[10px] ${result.ok ? 'text-green' : 'text-red'}`}>
                      {result.message}
                      {result.ok && result.postId && (
                        <>
                          {' '}
                          <Link href="/content" className="underline">
                            Ver en Publicaciones →
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
