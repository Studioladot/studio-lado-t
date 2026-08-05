import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { DiagnosticErrorPanel } from '@/components/features/diagnostic-error-panel'
import { isNextInternalControlFlow } from '@/lib/next-internal-error'
import { CampaignsFilterDropdown } from './campaigns-filter-dropdown'

const STATUS_LABEL: Record<string, string> = {
  planificacion: 'En planificación',
  activa: 'Activa',
  terminada: 'Terminada',
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  // Diagnóstico temporal (2026-08-06): ESLint (react-hooks/error-boundaries)
  // confirmó por qué las dos rondas anteriores no atraparon nada — React no
  // ejecuta el árbol de JSX de forma síncrona adentro de un try/catch, así
  // que esto SOLO puede cubrir código plano (fetch de datos), nunca el
  // render de un componente hijo (PiecesList, CampaignDetailsForm, etc.).
  // Sigue siendo útil: si la excepción real está en las queries de acá, la
  // vamos a ver.
  let estado: string | undefined
  let activeOrganizationId: string | null

  try {
    ;({ estado } = await searchParams)
    ;({ activeOrganizationId } = await getDashboardContext())
  } catch (err) {
    if (isNextInternalControlFlow(err)) throw err
    console.error('[CampaignsPage] excepción real (contexto):', err)
    return <DiagnosticErrorPanel error={err} context="/campaigns — getDashboardContext" />
  }

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  try {
    return await renderCampaignsList(activeOrganizationId, estado)
  } catch (err) {
    if (isNextInternalControlFlow(err)) throw err
    console.error('[CampaignsPage] excepción real:', err)
    return <DiagnosticErrorPanel error={err} context="/campaigns — renderCampaignsList" />
  }
}

async function renderCampaignsList(activeOrganizationId: string, estado: string | undefined) {
  const supabase = await createClient()

  const [{ data: campaigns }, { data: pieces }] = await Promise.all([
    supabase
      .from('content_campaigns')
      .select('*')
      .eq('organization_id', activeOrganizationId)
      .order('created_at', { ascending: false }),
    supabase
      .from('content_piezas')
      .select('campaign_id, status')
      .eq('organization_id', activeOrganizationId),
  ])

  const piecesByCampaign = new Map<string, { total: number; done: number }>()
  for (const piece of pieces ?? []) {
    const entry = piecesByCampaign.get(piece.campaign_id) ?? { total: 0, done: 0 }
    entry.total += 1
    if (piece.status === 'publicado' || piece.status === 'publicada') entry.done += 1
    piecesByCampaign.set(piece.campaign_id, entry)
  }

  const filtered = (campaigns ?? []).filter((camp) => {
    if (estado === 'activa') return camp.status === 'activa'
    if (estado === 'apagada') return camp.status !== 'activa'
    return true
  })

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Campañas de contenido</h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            Planificación de contenido orgánico — campañas, piezas y calendario
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="rounded-control bg-primary px-[18px] py-[10px] text-[13px] font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover hover:shadow-[0_0_28px_var(--primary-glow),0_0_8px_rgba(45,91,138,0.2)] active:scale-[0.98]"
        >
          + Nueva campaña
        </Link>
      </div>

      <div className="mb-4">
        <CampaignsFilterDropdown estado={estado} />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm font-medium text-text">
            {campaigns?.length ? 'Sin campañas con estos filtros' : 'Sin campañas todavía'}
          </p>
          {!campaigns?.length && (
            <p className="text-xs text-text-2">Creá tu primera campaña de contenido</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {filtered.map((camp) => {
            const stats = piecesByCampaign.get(camp.id)
            const pct = stats && stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : null

            return (
              <Link
                key={camp.id}
                href={`/campaigns/${camp.id}`}
                className="block overflow-hidden rounded-card border border-border bg-surface transition-all duration-200 ease-out hover:border-border-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                  <div>
                    {camp.periodo && <p className="mb-0.5 text-xs text-text-2">{camp.periodo}</p>}
                    <h2 className="text-lg font-extrabold tracking-[-0.02em] text-text">{camp.nombre}</h2>
                    {stats && stats.total > 0 && (
                      <p className="mt-1 text-xs text-text-2">
                        {stats.done}/{stats.total} piezas publicadas
                      </p>
                    )}
                  </div>
                  <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
                    {STATUS_LABEL[camp.status ?? ''] ?? camp.status}
                  </span>
                </div>

                {pct !== null && (
                  <div className="h-[3px] bg-surface-2">
                    <div
                      className="h-full bg-accent transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                {camp.objetivo && (
                  <div className="px-5 py-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[.08em] text-text-2">
                      Objetivo
                    </p>
                    <p className="text-[13px] leading-relaxed text-text">{camp.objetivo}</p>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
