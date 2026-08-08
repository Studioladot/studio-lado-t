import { redirect } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getSubscriptionStatus } from '@/lib/billing/subscription'
import { PLANS, formatARS } from '@/lib/billing/plans'
import { SignOutButton } from '@/components/features/sign-out-button'
import { CheckoutButton } from './checkout-button'

// Muro de Pago (2026-08-08) — vive fuera de (dashboard) a propósito, mismo
// criterio que /onboarding: layout.tsx redirige acá cuando el trial venció,
// y esta pantalla no puede volver a redirigir de vuelta al dashboard o se
// arma un loop. Pantalla limpia, sin sidebar ni menú — la única salida es
// elegir un plan o cerrar sesión.
export default async function PaywallPage() {
  const { activeOrganizationId, organizations } = await getDashboardContext()

  if (!activeOrganizationId) {
    redirect('/onboarding')
  }

  const supabase = await createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('plan, trial_ends_at')
    .eq('id', activeOrganizationId)
    .maybeSingle()

  const status = org ? getSubscriptionStatus(org) : null
  const orgName = organizations.find((o) => o.id === activeOrganizationId)?.name ?? ''

  return (
    <div className="flex min-h-screen flex-col items-center bg-bg px-5 py-16">
      <div className="w-full max-w-[720px]">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <Image src="/logo-gotix.png" alt="Gotix" width={36} height={36} priority />
          <div>
            <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-text">
              {status?.kind === 'trial_expired' ? 'Tu período de prueba terminó' : 'Elegí tu plan'}
            </h1>
            <p className="mx-auto mt-2 max-w-[420px] text-[14px] leading-relaxed text-text-2">
              {status?.kind === 'trial_expired'
                ? `${orgName ? `${orgName} — ya` : 'Ya'} probaste Gotix 7 días. Elegí un plan para seguir viendo tus campañas, contenido y métricas sin cortes.`
                : 'Elegí el plan que mejor te sirve — podés cambiarlo cuando quieras.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div key={plan.id} className="flex flex-col rounded-card border border-border bg-surface p-6">
              <p className="text-sm font-bold text-text">{plan.name}</p>
              <p className="mt-2 tabular-nums text-[28px] font-extrabold tracking-[-0.02em] text-text">
                {formatARS(plan.price)}
                <span className="text-xs font-medium text-text-3"> /mes</span>
              </p>
              <ul className="mt-4 flex flex-1 flex-col gap-2">
                {plan.features.map((f) => (
                  <li key={f} className="text-[13px] leading-relaxed text-text-2">
                    · {f}
                  </li>
                ))}
              </ul>
              <CheckoutButton planId={plan.id} />
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-xs text-text-3">El pago se procesa con Mercado Pago — vas a volver a Gotix apenas se confirme.</p>
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
