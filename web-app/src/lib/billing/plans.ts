// Fuente única de los planes pagos — precios reales confirmados por el
// usuario (2026-07-25). Antes vivían hardcodeados solo en
// settings/billing/page.tsx; ahora también los usa /paywall, así que se
// mueven acá para que un cambio de precio no haya que hacerlo en 2 lugares.
export type PlanId = 'base' | 'pro'

export type Plan = {
  id: PlanId
  name: string
  price: number
  features: string[]
}

export const PLANS: Plan[] = [
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
    features: ['Más miembros de equipo', 'Más cuentas de Meta Ads conectadas', 'Consultas de IA ilimitadas'],
  },
]

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}

export function formatARS(amount: number): string {
  return `$${amount.toLocaleString('es-AR')}`
}
