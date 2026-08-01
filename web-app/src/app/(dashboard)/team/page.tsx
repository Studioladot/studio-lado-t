import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { InviteMemberForm } from './invite-member-form'
import { removeMemberAction, updateMemberRoleAction } from './actions'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { roleLabel } from '@/lib/organization/roles'

type Member = { user_id: string; role: string; email: string }

export default async function TeamPage() {
  const { userId, activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_organization_members', {
    org_id: activeOrganizationId,
  })

  const members = (data ?? []) as Member[]
  const myRole = members.find((m) => m.user_id === userId)?.role
  const isOwner = myRole === 'owner'

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Equipo</h1>
        <p className="mt-0.5 text-[13px] text-text-2">Quién tiene acceso a esta organización</p>
      </div>

      {error ? (
        <div className="rounded-card border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">
          No pudimos cargar el equipo. Probá de nuevo.
        </div>
      ) : (
        <>
          <div className="mb-6 overflow-hidden rounded-card border border-border bg-surface">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{member.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      member.role === 'admin' ? 'border-accent/40 bg-accent/[8%] text-accent' : 'border-border bg-surface-2 text-text-2'
                    }`}
                  >
                    {roleLabel(member.role)}
                  </span>
                  {/* Promover/degradar a Admin — exclusivo del dueño, nunca sobre sí mismo ni sobre otro dueño. */}
                  {isOwner && member.user_id !== userId && member.role !== 'owner' && (
                    <form action={updateMemberRoleAction.bind(null, member.user_id, member.role === 'admin' ? 'member' : 'admin')}>
                      <button
                        type="submit"
                        className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-text"
                      >
                        {member.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
                      </button>
                    </form>
                  )}
                  {isOwner && member.user_id !== userId && (
                    <form action={removeMemberAction.bind(null, member.user_id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`¿Quitar a ${member.email} de esta organización?`}
                        className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                      >
                        Quitar
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isOwner ? (
            <div className="rounded-card border border-border bg-surface p-5">
              <InviteMemberForm />
            </div>
          ) : (
            <p className="text-xs text-text-3">Solo el dueño de la organización puede invitar o quitar miembros.</p>
          )}
        </>
      )}
    </div>
  )
}
