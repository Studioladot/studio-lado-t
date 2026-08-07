import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { computeWinnerScriptIds } from '@/lib/meta/script-winners'
import { CreateScriptButton } from './create-script-button'
import { ScriptsList } from './scripts-list'

export default async function ScriptsPage() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  // Variantes de hook generadas por IA (parent_guion_id != null) no entran acá —
  // viven colgadas del guion original y se ven en su "Variantes del gancho"
  // (script-edit-form.tsx), listarlas también en el nivel superior sería ruido.
  const supabase = await createClient()
  const { data: scripts } = await supabase
    .from('scripts')
    .select('*')
    .eq('organization_id', activeOrganizationId)
    .is('parent_guion_id', null)
    .order('updated_at', { ascending: false })

  const winnerScriptIds = scripts?.length
    ? [...(await computeWinnerScriptIds(supabase, activeOrganizationId, scripts.map((s) => s.id)))]
    : []

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Guiones</h1>
          <p className="mt-0.5 text-[13px] text-text-2">Editor de scripts y ángulos creativos</p>
        </div>
        <CreateScriptButton />
      </div>

      {!scripts?.length ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm font-medium text-text">Sin guiones todavía</p>
          <p className="text-xs text-text-2">Creá tu primer guion para empezar a probar ángulos creativos</p>
        </div>
      ) : (
        <ScriptsList scripts={scripts} winnerScriptIds={winnerScriptIds} />
      )}
    </div>
  )
}
