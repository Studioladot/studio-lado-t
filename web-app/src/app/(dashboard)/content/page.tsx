import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { ContentTabs } from './content-tabs'

export default async function ContentPage() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()

  const [{ data: posts }, { data: pieces }, { data: campaigns }] = await Promise.all([
    supabase
      .from('content_posts')
      .select('*')
      .eq('organization_id', activeOrganizationId)
      .order('date', { ascending: false }),
    supabase
      .from('content_piezas')
      .select('*')
      .eq('organization_id', activeOrganizationId)
      .order('fecha_planificada', { ascending: true }),
    supabase
      .from('content_campaigns')
      .select('*')
      .eq('organization_id', activeOrganizationId),
  ])

  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Contenido</h1>
        <p className="mt-0.5 text-[13px] text-text-2">
          Planificación, control y ranking de tu estrategia de contenido
        </p>
      </div>

      <ContentTabs posts={posts ?? []} pieces={pieces ?? []} campaigns={campaigns ?? []} />
    </div>
  )
}
