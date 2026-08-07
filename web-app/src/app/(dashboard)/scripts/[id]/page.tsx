import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getCreativesByScriptId } from '@/lib/meta/library'
import { computeWinnerScriptIds } from '@/lib/meta/script-winners'
import { ScriptEditForm } from './script-edit-form'
import { LinkedCreatives } from './linked-creatives'

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

  const [creatives, winnerIds, variantsResult, parentResult] = await Promise.all([
    getCreativesByScriptId(supabase, activeOrganizationId, id),
    computeWinnerScriptIds(supabase, activeOrganizationId, [id]),
    supabase.from('scripts').select('*').eq('organization_id', activeOrganizationId).eq('parent_guion_id', id).order('created_at', { ascending: true }),
    script.parent_guion_id
      ? supabase.from('scripts').select('id, title').eq('organization_id', activeOrganizationId).eq('id', script.parent_guion_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return (
    <div className="mx-auto max-w-[720px]">
      <ScriptEditForm
        script={script}
        isWinner={winnerIds.has(id)}
        variants={variantsResult.data ?? []}
        parentScript={parentResult.data ?? null}
      />
      <LinkedCreatives creatives={creatives} />
    </div>
  )
}
