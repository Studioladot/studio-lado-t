import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { GenerateEntryButton } from './generate-entry-button'

export default async function IntelligenceBrandJournalPage() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('brand_journal_entries')
    .select('id, month, narrative, stats')
    .eq('organization_id', activeOrganizationId)
    .order('month', { ascending: false })

  const entries = data ?? []
  const monthKey = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const hasEntryThisMonth = entries.some((e) => e.month === monthKey)

  return (
    <div>
      <div className="mb-[22px] flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Diario de Marca</h1>
          <p className="mt-0.5 max-w-[520px] text-[13px] text-text-2">
            Un resumen mensual auto-generado con lo que pasó de verdad — gasto, ROAS, qué hizo el Autopiloto, qué
            guiones ganaron.
          </p>
        </div>
        <GenerateEntryButton hasEntryThisMonth={hasEntryThisMonth} />
      </div>

      {entries.length === 0 ? (
        <div className="rounded-card border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-text">Sin entradas todavía</p>
          <p className="mt-1 text-xs text-text-2">Generá el resumen de este mes para arrancar el diario.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map((entry) => {
            const stats = (entry.stats ?? {}) as {
              spend?: number
              revenue?: number
              roas?: number
              activeCampaigns?: number
              autopilotActions?: number
            }
            const monthLabel = new Date(`${entry.month}T00:00:00`).toLocaleDateString('es-AR', {
              month: 'long',
              year: 'numeric',
            })
            return (
              <div key={entry.id} className="rounded-card border border-border bg-surface p-5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-3">{monthLabel}</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{entry.narrative}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-text-3">Gasto</p>
                    <p className="tabular-nums text-xs font-semibold text-text">${stats.spend ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-text-3">ROAS</p>
                    <p className="tabular-nums text-xs font-semibold text-text">{stats.roas ?? 0}x</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-text-3">Campañas activas</p>
                    <p className="tabular-nums text-xs font-semibold text-text">{stats.activeCampaigns ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-text-3">Acciones Autopiloto</p>
                    <p className="tabular-nums text-xs font-semibold text-text">{stats.autopilotActions ?? 0}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
