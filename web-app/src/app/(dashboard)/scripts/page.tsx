import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { CreateScriptButton } from './create-script-button'
import { STATUS_LABEL, STATUS_COLOR } from './constants'

export default async function ScriptsPage() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: scripts } = await supabase
    .from('scripts')
    .select('*')
    .eq('organization_id', activeOrganizationId)
    .order('updated_at', { ascending: false })

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
        <div className="flex flex-col gap-2.5">
          {scripts.map((script) => (
            <Link
              key={script.id}
              href={`/scripts/${script.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface px-5 py-4 transition-all duration-200 ease-out hover:border-border-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{script.title || 'Sin título'}</p>
                <p className="mt-0.5 text-xs text-text-2">{script.angle || '—'}</p>
              </div>
              <span
                className={`shrink-0 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  STATUS_COLOR[script.status ?? ''] ?? 'text-text-2'
                }`}
              >
                {STATUS_LABEL[script.status ?? ''] ?? script.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
