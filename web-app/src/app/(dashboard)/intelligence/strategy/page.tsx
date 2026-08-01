import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { StrategyChat } from './strategy-chat'

export default async function IntelligenceStrategyPage() {
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
    .from('ia_chat_messages')
    .select('id, role, content')
    .eq('organization_id', activeOrganizationId)
    .order('created_at', { ascending: true })

  const messages = (data ?? []).map((m) => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content }))

  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">IA Estratégica</h1>
        <p className="mt-0.5 max-w-[560px] text-[13px] text-text-2">
          Chateá con el contexto real de tu negocio — campañas activas, objetivos de CPA/ROAS, guiones ganadores.
        </p>
      </div>

      <StrategyChat initialMessages={messages} />
    </div>
  )
}
