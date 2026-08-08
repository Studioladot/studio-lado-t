'use client'

import Link from 'next/link'
import { useOrganization } from '@/lib/context/organization-context'
import { getSubscriptionStatus } from '@/lib/billing/subscription'

// Banner de trial en el sidebar (2026-08-08) — puramente tipográfico, sin
// ningún ícono ni barra de progreso: una línea de texto con los días
// restantes y un link. Solo se muestra durante el trial activo — si venció,
// (dashboard)/layout.tsx ya redirige a /paywall antes de que este
// componente llegue a montarse.
export function TrialBanner({ collapsed }: { collapsed: boolean }) {
  const { activeOrganization } = useOrganization()
  if (!activeOrganization) return null

  const status = getSubscriptionStatus(activeOrganization)
  if (status.kind !== 'trial_active') return null

  if (collapsed) {
    return (
      <div className="mx-2 mb-2 rounded-md border border-white/[0.08] px-1 py-2 text-center" title={`Quedan ${status.daysLeft} días de prueba`}>
        <span className="text-[11px] font-bold tabular-nums text-accent">{status.daysLeft}d</span>
      </div>
    )
  }

  return (
    <div className="mx-2 mb-2 rounded-md border border-white/[0.08] px-3 py-2.5">
      <p className="text-[11px] font-semibold text-white/80">
        Quedan {status.daysLeft} día{status.daysLeft === 1 ? '' : 's'} de prueba
      </p>
      <Link href="/settings/billing" className="mt-0.5 block text-[11px] font-medium text-accent transition-colors duration-200 ease-out hover:text-white">
        Elegir plan →
      </Link>
    </div>
  )
}
