import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'

// Precios reales confirmados por el usuario (2026-07-25) — sin checkout
// funcional todavía (necesita una cuenta real de Mercado Pago). El botón
// de upgrade es un mailto: a gotixcontacto@gmail.com (canal real
// confirmado) — conexión temporal hasta que haya checkout en línea.
const UPGRADE_EMAIL = 'gotixcontacto@gmail.com'

const PLANS = [
  {
    id: 'base',
    name: 'Plan Base',
    price: 30000,
    features: ['Uso estándar de la plataforma', '1 cuenta de Meta Ads conectada'],
  },
  {
    id: 'pro',
    name: 'Plan Pro',
    price: 50000,
    features: ['Más miembros de equipo', 'Más cuentas de Meta Ads conectadas'],
  },
]

function formatARS(amount: number) {
  return `$${amount.toLocaleString('es-AR')}`
}

export default async function SettingsBillingPage() {
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
  const trialEndsAt = org?.trial_ends_at ? new Date(org.trial_ends_at) : null
  const now = new Date()
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000)) : null
  const trialExpired = trialEndsAt ? trialEndsAt < now : false

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Facturación</h1>
        <p className="mt-0.5 text-[13px] text-text-2">Tu plan actual y las opciones disponibles.</p>
      </div>

      <div className="mb-4 rounded-card border border-border bg-surface p-5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Plan actual</p>
        <p className="mt-1 text-lg font-semibold capitalize text-text">{plan === 'trial' ? 'Período de prueba' : plan}</p>
        {plan === 'trial' &&
          (trialEndsAt ? (
            <p className={`mt-1 text-sm ${trialExpired ? 'text-red' : 'text-text-2'}`}>
              {trialExpired ? 'Tu período de prueba venció.' : `Quedan ${daysLeft} día${daysLeft === 1 ? '' : 's'} de prueba.`}
            </p>
          ) : (
            <p className="mt-1 text-sm text-text-2">Sin fecha de vencimiento configurada todavía.</p>
          ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PLANS.map((p) => (
          <div key={p.id} className="rounded-card border border-border bg-surface p-5">
            <p className="text-sm font-bold text-text">{p.name}</p>
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
            <a
              href={`mailto:${UPGRADE_EMAIL}?subject=${encodeURIComponent(`Quiero upgradear a ${p.name}`)}&body=${encodeURIComponent(
                `Hola, quiero pasar mi cuenta de Gotix al ${p.name} ($${p.price.toLocaleString('es-AR')}/mes).`
              )}`}
              className="mt-4 block rounded-control border border-accent/30 bg-accent/[0.06] px-4 py-2 text-center text-xs font-semibold text-accent transition-all duration-200 ease-out hover:bg-accent/[0.12]"
            >
              Escribinos para upgradear
            </a>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-text-3">
        El pago en línea todavía no está disponible — mientras tanto, coordinamos el upgrade por fuera de la
        plataforma.
      </p>
    </div>
  )
}
