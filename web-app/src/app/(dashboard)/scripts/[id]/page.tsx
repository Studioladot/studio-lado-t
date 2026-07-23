import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { ScriptEditForm } from './script-edit-form'

export default async function ScriptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: script } = await supabase
    .from('scripts')
    .select('*')
    .eq('id', id)
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  if (!script) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <ScriptEditForm script={script} />
    </div>
  )
}
