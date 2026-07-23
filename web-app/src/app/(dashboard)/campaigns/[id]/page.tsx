import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { CampaignDetailsForm } from './campaign-details-form'
import { AddPieceForm } from './add-piece-form'
import { AddPieceMediaForm } from './add-piece-media-form'
import { togglePieceStatusAction } from './actions'

const STATUS_LABEL: Record<string, string> = {
  planificacion: 'En planificación',
  activa: 'Activa',
  terminada: 'Terminada',
}

const TURNO_COLOR: Record<string, string> = {
  Temprano: 'text-amber',
  Tarde: 'text-accent',
  Noche: 'text-[#8b5cf6]',
}

type MediaItem = { url: string; type: 'image' | 'video' }

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

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    notFound()
  }

  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('content_campaigns')
    .select('*')
    .eq('id', id)
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  if (!campaign) {
    notFound()
  }

  const { data: pieces } = await supabase
    .from('content_piezas')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('organization_id', activeOrganizationId)
    .order('fecha_planificada', { ascending: true })

  return (
    <div className="mx-auto max-w-[840px]">
      <Link
        href="/campaigns"
        className="mb-4 inline-block text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
      >
        ← Volver a campañas
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          {campaign.periodo && <p className="mb-0.5 text-xs text-text-2">{campaign.periodo}</p>}
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em] text-text">{campaign.nombre}</h1>
          {(campaign.fecha_inicio || campaign.fecha_fin) && (
            <p className="mt-1 text-xs text-text-2">
              {campaign.fecha_inicio ?? '—'} → {campaign.fecha_fin ?? '—'}
            </p>
          )}
        </div>
        <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
          {STATUS_LABEL[campaign.status ?? ''] ?? campaign.status}
        </span>
      </div>

      <section className="mb-8 rounded-card border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-bold text-text">Detalles de la campaña</h2>
        <CampaignDetailsForm campaign={campaign} />
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-text">
            Piezas {pieces && pieces.length > 0 ? `(${pieces.length})` : ''}
          </h2>
        </div>

        <div className="mb-4">
          <AddPieceForm campaignId={campaign.id} />
        </div>

        {!pieces || pieces.length === 0 ? (
          <div className="rounded-card border border-border bg-surface px-6 py-12 text-center">
            <p className="text-sm font-medium text-text">Sin piezas todavía</p>
            <p className="mt-1 text-xs text-text-2">
              Cargá el material visual del drop, los anuncios de Meta Ads o las fotos de estudio.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {pieces.map((piece) => {
              const isPublished = piece.status === 'publicado' || piece.status === 'publicada'
              const nextStatus = isPublished ? 'pendiente' : 'publicado'
              const media = parseMediaUrls(piece.media_urls)

              return (
                <div
                  key={piece.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-card border border-border bg-surface p-4"
                >
                  {media.length > 0 && (
                    <div className="flex shrink-0 gap-1.5">
                      {media.slice(0, 3).map((item, i) => (
                        <a
                          key={i}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-14 w-14 overflow-hidden rounded-control border border-border bg-surface-2 transition-opacity duration-200 ease-out hover:opacity-80"
                        >
                          {item.type === 'video' ? (
                            <video src={item.url} className="h-full w-full object-cover" muted />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </a>
                      ))}
                      {media.length > 3 && (
                        <div className="flex h-14 w-14 items-center justify-center rounded-control border border-border bg-surface-2 text-xs font-semibold text-text-2">
                          +{media.length - 3}
                        </div>
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
                    </div>
                    {piece.protagonista && (
                      <p className="mt-1 text-xs text-text-2">Con {piece.protagonista}</p>
                    )}
                    {piece.notas && <p className="mt-1 text-xs text-text-2">{piece.notas}</p>}
                    {piece.fecha_planificada && (
                      <p className="mt-1 text-[11px] text-text-3">{piece.fecha_planificada}</p>
                    )}
                    <AddPieceMediaForm pieceId={piece.id} campaignId={campaign.id} />
                  </div>

                  <form
                    action={togglePieceStatusAction.bind(null, piece.id, campaign.id, nextStatus)}
                  >
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
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
