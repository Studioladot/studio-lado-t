import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getContentPillars } from '@/lib/pillars'
import { NotesGrid } from './notes-grid'

export default async function NotesPage() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const [{ data }, pillars] = await Promise.all([
    supabase.from('notes').select('*').eq('organization_id', activeOrganizationId).order('created_at', { ascending: false }),
    getContentPillars(supabase, activeOrganizationId),
  ])

  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Notas</h1>
        <p className="mt-0.5 text-[13px] text-text-2">Ideas sueltas, pensamientos, lo que se te ocurra</p>
      </div>

      <NotesGrid notes={data ?? []} pillars={pillars} />
    </div>
  )
}
