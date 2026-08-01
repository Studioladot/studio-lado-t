import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ACCOUNT_STATUS_LABEL, type MetaAdAccount } from '@/lib/meta/accounts'
import { META_OAUTH_PENDING_COOKIE } from '@/lib/meta/oauth'
import { selectMetaAccountAction, cancelMetaAccountSelectionAction } from './actions'

type PendingSelection = { token: string; expiresAt: string; accounts: MetaAdAccount[] }

export default async function SelectMetaAccountPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get(META_OAUTH_PENDING_COOKIE)?.value

  if (!raw) {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent('La selección expiró — probá conectar de nuevo.'))
  }

  let pending: PendingSelection
  try {
    pending = JSON.parse(raw) as PendingSelection
  } catch {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent('La selección expiró — probá conectar de nuevo.'))
  }

  const { accounts } = pending

  return (
    <div className="mx-auto max-w-[560px]">
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Elegí una cuenta publicitaria</h1>
        <p className="mt-0.5 text-[13px] text-text-2">
          Tu usuario de Meta tiene acceso a {accounts.length} cuentas — elegí con cuál trabajar en esta organización.
        </p>
      </div>

      <form action={selectMetaAccountAction} className="flex flex-col gap-2.5">
        {accounts.map((account) => {
          const isActive = account.status === 1
          return (
            <button
              key={account.id}
              type="submit"
              name="account_id"
              value={account.id}
              className="flex w-full items-center justify-between gap-3 rounded-card border border-border bg-surface px-5 py-4 text-left transition-all duration-200 ease-out hover:border-accent hover:bg-accent/[0.04] active:scale-[0.99]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{account.name}</p>
                <p className="mt-0.5 truncate text-xs text-text-2">
                  {account.businessName ? `${account.businessName} · ` : ''}ID {account.id}
                  {account.currency ? ` · ${account.currency}` : ''}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  isActive ? 'bg-green/[0.12] text-green' : 'bg-surface-2 text-text-3'
                }`}
              >
                {ACCOUNT_STATUS_LABEL[account.status] ?? 'Otro estado'}
              </span>
            </button>
          )
        })}
      </form>

      <form action={cancelMetaAccountSelectionAction} className="mt-4">
        <button
          type="submit"
          className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-text"
        >
          ← Cancelar
        </button>
      </form>
    </div>
  )
}
