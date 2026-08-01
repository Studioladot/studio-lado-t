import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { InstagramBusinessAccount } from '@/lib/instagram/accounts'
import { INSTAGRAM_OAUTH_PENDING_COOKIE } from '@/lib/meta/oauth'
import { selectInstagramAccountAction, cancelInstagramAccountSelectionAction } from './actions'

type PendingSelection = { accounts: InstagramBusinessAccount[]; fbUserId: string | null }

export default async function SelectInstagramAccountPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get(INSTAGRAM_OAUTH_PENDING_COOKIE)?.value

  if (!raw) {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent('La selección de Instagram expiró — probá conectar de nuevo.'))
  }

  let pending: PendingSelection
  try {
    pending = JSON.parse(raw) as PendingSelection
  } catch {
    redirect('/settings/integrations?meta_error=' + encodeURIComponent('La selección de Instagram expiró — probá conectar de nuevo.'))
  }

  const { accounts } = pending

  return (
    <div className="mx-auto max-w-[560px]">
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Elegí una cuenta de Instagram</h1>
        <p className="mt-0.5 text-[13px] text-text-2">
          Encontramos {accounts.length} cuentas de Instagram Business vinculadas a tus Páginas de Facebook — elegí con cuál trabajar en esta organización.
        </p>
      </div>

      <form action={selectInstagramAccountAction} className="flex flex-col gap-2.5">
        {accounts.map((account) => (
          <button
            key={account.pageId}
            type="submit"
            name="page_id"
            value={account.pageId}
            className="flex w-full items-center gap-3 rounded-card border border-border bg-surface px-5 py-4 text-left transition-all duration-200 ease-out hover:border-accent hover:bg-accent/[0.04] active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-glow text-primary">
              {account.profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={account.profilePictureUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                </svg>
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">@{account.igUsername ?? account.pageId}</p>
              <p className="mt-0.5 truncate text-xs text-text-2">Página &ldquo;{account.pageName}&rdquo;</p>
            </div>
          </button>
        ))}
      </form>

      <form action={cancelInstagramAccountSelectionAction} className="mt-4">
        <button type="submit" className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-text">
          ← Cancelar
        </button>
      </form>
    </div>
  )
}
