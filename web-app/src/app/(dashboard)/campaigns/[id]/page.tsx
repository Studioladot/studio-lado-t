import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { CampaignDetailsForm } from './campaign-details-form'
import { AddPieceForm } from './add-piece-form'
import { PiecesList } from './pieces-list'
import { deleteCampaignAction } from './actions'
import { NotesGrid } from '../../notes/notes-grid'
import { getContentPillars } from '@/lib/pillars'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { DiagnosticErrorPanel } from '@/components/features/diagnostic-error-panel'
import { isNextInternalControlFlow } from '@/lib/next-internal-error'
import { DEFAULT_CAMPAIGN_COLOR } from '../campaign-colors'

const STATUS_LABEL: Record<string, string> = {
  planificacion: 'En planificación',
  activa: 'Activa',
  terminada: 'Terminada',
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Diagnóstico temporal (2026-08-06): el try/catch de la ronda anterior
  // no atrapó nada nuevo (el digest cambió mismo así) — cubría solo
  // renderCampaignDetail, no getDashboardContext() ni el await de params,
  // que corrían antes del try. Ahora TODO el cuerpo de la página está
  // adentro, sin excepción.
  try {
    const { id } = await params
    const { activeOrganizationId } = await getDashboardContext()

    if (!activeOrganizationId) {
      notFound()
    }

    return await renderCampaignDetail(id, activeOrganizationId)
  } catch (err) {
    // notFound() tira una excepción especial con digest "NEXT_NOT_FOUND"
    // (redirect() usa "NEXT_REDIRECT") — hay que dejarlas pasar para que
    // el framework haga lo suyo, nunca tratarlas como un error nuestro.
    if (isNextInternalControlFlow(err)) throw err
    console.error('[CampaignDetailPage] excepción real:', err)
    return <DiagnosticErrorPanel error={err} context="/campaigns/[id]" />
  }
}

async function renderCampaignDetail(id: string, activeOrganizationId: string) {
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

  const [{ data: pieces }, { data: instagramConnection }, { data: tiktokConnection }, { data: notes }, pillars] = await Promise.all([
    supabase
      .from('content_piezas')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('organization_id', activeOrganizationId)
      .order('fecha_planificada', { ascending: true }),
    supabase.from('instagram_connections').select('id').eq('organization_id', activeOrganizationId).maybeSingle(),
    supabase.from('tiktok_connections').select('id').eq('organization_id', activeOrganizationId).maybeSingle(),
    // Killer feature de cierre de Fase 1 (2026-08-06) — Notas era el único
    // módulo hermano sin ninguna relación con Campañas.
    supabase
      .from('notes')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('organization_id', activeOrganizationId)
      .order('created_at', { ascending: false }),
    getContentPillars(supabase, activeOrganizationId),
  ])
  const instagramConnected = !!instagramConnection
  const tiktokConnected = !!tiktokConnection
  const campaignColor = campaign.color ?? DEFAULT_CAMPAIGN_COLOR

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
          <h1 className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.03em] text-text">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: campaignColor }} aria-hidden="true" />
            {campaign.nombre}
          </h1>
          {(campaign.fecha_inicio || campaign.fecha_fin) && (
            <p className="mt-1 text-xs text-text-2">
              {campaign.fecha_inicio ?? '—'} → {campaign.fecha_fin ?? '—'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
            {STATUS_LABEL[campaign.status ?? ''] ?? campaign.status}
          </span>
          <form action={deleteCampaignAction.bind(null, campaign.id)}>
            <ConfirmSubmitButton
              confirmMessage={`¿Borrar la campaña "${campaign.nombre}" y todas sus piezas? Esta acción no se puede deshacer.`}
              className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
            >
              Borrar campaña
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <section
        className="mb-8 rounded-card border border-border bg-surface p-6"
        style={{ borderLeftWidth: '3px', borderLeftColor: campaignColor }}
      >
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
          <AddPieceForm campaignId={campaign.id} instagramConnected={instagramConnected} tiktokConnected={tiktokConnected} />
        </div>

        <PiecesList pieces={pieces ?? []} campaignId={campaign.id} instagramConnected={instagramConnected} tiktokConnected={tiktokConnected} />
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-sm font-bold text-text">Notas de esta campaña</h2>
        <NotesGrid notes={notes ?? []} campaignId={campaign.id} pillars={pillars} />
      </section>
    </div>
  )
}
