import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getSubscriptionStatus } from '@/lib/billing/subscription'
import { PLANS, formatARS } from '@/lib/billing/plans'
import { CheckoutButton } from '@/app/paywall/checkout-button'

export default async function SettingsBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string }>
}) {
  const { mp } = await searchParams
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('plan, trial_ends_at')
    .eq('id', activeOrganizationId)
    .maybeSingle()

  const plan = org?.plan ?? 'trial'
  const status = org ? getSubscriptionStatus(org) : null

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Facturación</h1>
        <p className="mt-0.5 text-[13px] text-text-2">Tu plan actual y las opciones disponibles.</p>
      </div>

      {mp === 'success' && (
        <div className="mb-4 rounded-control border border-green/30 bg-green/[8%] px-4 py-2.5 text-sm text-green">
          Pago recibido — puede tardar unos segundos en reflejarse acá arriba.
        </div>
      )}

      <div className="mb-4 rounded-card border border-border bg-surface p-5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Plan actual</p>
        <p className="mt-1 text-lg font-semibold capitalize text-text">{plan === 'trial' ? 'Período de prueba' : plan}</p>
        {status?.kind === 'trial_active' && (
          <p className="mt-1 text-sm text-text-2">
            Quedan {status.daysLeft} día{status.daysLeft === 1 ? '' : 's'} de prueba.
          </p>
        )}
        {status?.kind === 'trial_expired' && <p className="mt-1 text-sm text-red">Tu período de prueba venció.</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PLANS.map((p) => {
          const isCurrent = plan === p.id
          return (
            <div key={p.id} className="rounded-card border border-border bg-surface p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-text">{p.name}</p>
                {isCurrent && <span className="text-[10px] font-bold uppercase tracking-wide text-green">Plan actual</span>}
              </div>
              <p className="mt-1 tabular-nums text-2xl font-semibold text-text">
                {formatARS(p.price)}
                <span className="text-xs font-medium text-text-3">/mes</span>
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {p.features.map((f) => (
                  <li key={f} className="text-xs text-text-2">
                    · {f}
                  </li>
                ))}
              </ul>
              {!isCurrent && <CheckoutButton planId={p.id} />}
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-xs text-text-3">El pago se procesa con Mercado Pago — el cambio de plan se aplica apenas se confirma.</p>
    </div>
  )
}
