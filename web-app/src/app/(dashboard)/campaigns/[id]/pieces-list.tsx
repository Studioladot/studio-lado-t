'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { togglePieceStatusAction, deletePieceAction } from './actions'
import { AddPieceMediaForm } from './add-piece-media-form'
import { PieceEditForm } from './piece-edit-form'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import type { Database } from '@/lib/types/database.types'

type Piece = Database['public']['Tables']['content_piezas']['Row']
type MediaItem = { url: string; type: 'image' | 'video' }
type FlatMedia = MediaItem & { pieceTitle: string }

const TURNO_COLOR: Record<string, string> = {
  Temprano: 'text-amber',
  Tarde: 'text-accent',
  Noche: 'text-[#8b5cf6]',
}

// Badges de estado real de auto-publicación — distinto del toggle manual
// "pendiente/publicado" de más abajo (ese es un checklist del equipo, este
// es lo que GOTIX efectivamente hizo contra la API de Instagram). Solo se
// muestra cuando publish_status !== 'none' — una pieza nunca programada no
// necesita este badge.
const PUBLISH_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Programado', className: 'border-accent/40 bg-accent/[8%] text-accent' },
  publishing: { label: 'Publicando…', className: 'border-amber/40 bg-amber/[8%] text-amber animate-pulse' },
  published: { label: 'Publicado', className: 'border-green/40 bg-green/[8%] text-green' },
  failed: { label: 'Error', className: 'border-red/40 bg-red/[8%] text-red' },
}

function PublishStatusBadge({ piece }: { piece: Piece }) {
  const badge = PUBLISH_STATUS_BADGE[piece.publish_status]
  if (!badge) return null

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.className}`}>
      {badge.label}
    </span>
  )
}

function parseMediaUrls(value: unknown): MediaItem[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is MediaItem =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as MediaItem).url === 'string' &&
      ((item as MediaItem).type === 'image' || (item as MediaItem).type === 'video')
  )
}

export function PiecesList({
  pieces,
  campaignId,
  instagramConnected,
  tiktokConnected,
}: {
  pieces: Piece[]
  campaignId: string
  instagramConnected: boolean
  tiktokConnected: boolean
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const piecesWithMedia = useMemo(() => {
    const mediaLists = pieces.map((piece) => parseMediaUrls(piece.media_urls))
    return pieces.map((piece, i) => ({
      piece,
      media: mediaLists[i],
      startIndex: mediaLists.slice(0, i).reduce((sum, m) => sum + m.length, 0),
    }))
  }, [pieces])

  const allMedia: FlatMedia[] = useMemo(
    () =>
      piecesWithMedia.flatMap(({ piece, media }) =>
        media.map((item) => ({ ...item, pieceTitle: piece.titulo }))
      ),
    [piecesWithMedia]
  )

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])
  const showPrev = useCallback(
    () =>
      setLightboxIndex((i) => (i === null ? null : (i - 1 + allMedia.length) % allMedia.length)),
    [allMedia.length]
  )
  const showNext = useCallback(
    () => setLightboxIndex((i) => (i === null ? null : (i + 1) % allMedia.length)),
    [allMedia.length]
  )

  useEffect(() => {
    if (lightboxIndex === null) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') showPrev()
      if (e.key === 'ArrowRight') showNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex, closeLightbox, showPrev, showNext])

  if (pieces.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface px-6 py-12 text-center">
        <p className="text-sm font-medium text-text">Sin piezas todavía</p>
        <p className="mt-1 text-xs text-text-2">
          Cargá el material visual del drop, los anuncios de Meta Ads o las fotos de estudio.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {piecesWithMedia.map(({ piece, media, startIndex }) => {
          const isPublished = piece.status === 'publicado' || piece.status === 'publicada'
          const nextStatus = isPublished ? 'pendiente' : 'publicado'

          if (editingId === piece.id) {
            return (
              <div
                key={piece.id}
                className="rounded-card border border-border bg-surface p-4"
              >
                <PieceEditForm
                  piece={piece}
                  campaignId={campaignId}
                  instagramConnected={instagramConnected}
                  tiktokConnected={tiktokConnected}
                  onSaved={() => setEditingId(null)}
                />
              </div>
            )
          }

          return (
            <div
              key={piece.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-card border border-border bg-surface p-4"
            >
              {media.length > 0 && (
                <div className="flex shrink-0 gap-1.5">
                  {media.slice(0, 3).map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightboxIndex(startIndex + i)}
                      className="block h-14 w-14 overflow-hidden rounded-control border border-border bg-surface-2 transition-opacity duration-200 ease-out hover:opacity-80"
                    >
                      {item.type === 'video' ? (
                        <video src={item.url} className="h-full w-full object-cover" muted />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.url} alt="" className="h-full w-full object-cover" />
                      )}
                    </button>
                  ))}
                  {media.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(startIndex + 3)}
                      className="flex h-14 w-14 items-center justify-center rounded-control border border-border bg-surface-2 text-xs font-semibold text-text-2 transition-opacity duration-200 ease-out hover:opacity-80"
                    >
                      +{media.length - 3}
                    </button>
                  )}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-sm font-semibold text-text ${isPublished ? 'text-text-2 line-through' : ''}`}
                  >
                    {piece.titulo}
                  </span>
                  {piece.formato && (
                    <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-text-2">
                      {piece.formato}
                    </span>
                  )}
                  {piece.plataforma && (
                    <span className="text-[10px] text-text-3">{piece.plataforma}</span>
                  )}
                  {piece.turno && (
                    <span className={`text-[10px] font-medium ${TURNO_COLOR[piece.turno] ?? 'text-text-2'}`}>
                      {piece.turno}
                    </span>
                  )}
                  <PublishStatusBadge piece={piece} />
                </div>
                {piece.protagonista && (
                  <p className="mt-1 text-xs text-text-2">Con {piece.protagonista}</p>
                )}
                {piece.notas && <p className="mt-1 text-xs text-text-2">{piece.notas}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-text-3">
                  {piece.fecha_planificada && <span>{piece.fecha_planificada}</span>}
                  {piece.publish_status === 'scheduled' && piece.scheduled_at && (
                    <span className="tabular-nums text-accent">
                      Auto-publica {new Date(piece.scheduled_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  )}
                  {piece.publish_status === 'published' && piece.ig_permalink && (
                    <a
                      href={piece.ig_permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-green transition-colors duration-200 ease-out hover:text-green/80"
                    >
                      Ver en Instagram ↗
                    </a>
                  )}
                  {piece.publish_status === 'failed' && piece.publish_error && (
                    <span className="text-red">{piece.publish_error}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <AddPieceMediaForm pieceId={piece.id} campaignId={campaignId} kind="final" />
                  <AddPieceMediaForm pieceId={piece.id} campaignId={campaignId} kind="reference" />
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <form action={togglePieceStatusAction.bind(null, piece.id, campaignId, nextStatus)}>
                  <button
                    type="submit"
                    className={`rounded-control border px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out active:scale-[0.98] ${
                      isPublished
                        ? 'border-border text-text-2 hover:bg-surface-2'
                        : 'border-green/40 bg-green/[8%] text-green hover:bg-green/[14%]'
                    }`}
                  >
                    {isPublished ? 'Marcar pendiente' : 'Marcar publicado'}
                  </button>
                </form>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingId(piece.id)}
                    className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
                  >
                    Editar
                  </button>
                  {/* Auditoría de cierre: borrar algo 'publishing' no cancela la publicación real en Instagram, solo pierde el registro local. */}
                  {piece.publish_status !== 'publishing' && (
                    <form action={deletePieceAction.bind(null, piece.id, campaignId)}>
                      <ConfirmSubmitButton
                        confirmMessage={`¿Estás seguro? Se va a borrar "${piece.titulo}".`}
                        className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                      >
                        Borrar
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {lightboxIndex !== null && allMedia[lightboxIndex] && (
        <MediaLightbox
          media={allMedia}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={showPrev}
          onNext={showNext}
        />
      )}
    </>
  )
}

function MediaLightbox({
  media,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  media: FlatMedia[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const item = media[index]
  const touchStartX = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta > 50) onPrev()
    else if (delta < -50) onNext()
    touchStartX.current = null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 ease-out hover:bg-white/20"
      >
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M4 4l10 10M14 4L4 14" />
        </svg>
      </button>

      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onPrev()
            }}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 ease-out hover:bg-white/20"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 3l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
            aria-label="Siguiente"
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 ease-out hover:bg-white/20"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 3l6 6-6 6" />
            </svg>
          </button>
        </>
      )}

      <div
        className="flex max-h-[85vh] max-w-[90vw] flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {item.type === 'video' ? (
          <video
            src={item.url}
            controls
            autoPlay
            className="max-h-[80vh] max-w-[90vw] rounded-control"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="" className="max-h-[80vh] max-w-[90vw] rounded-control object-contain" />
        )}
        {media.length > 1 && (
          <p className="text-xs text-white/70">
            {index + 1} / {media.length} — {item.pieceTitle}
          </p>
        )}
      </div>
    </div>
  )
}
