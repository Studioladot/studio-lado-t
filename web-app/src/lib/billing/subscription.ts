// Estado de suscripción — se DERIVA de organizations.plan/trial_ends_at,
// nunca se guarda un booleano tipo `trial_active` aparte: un campo
// redundante así puede desincronizarse de trial_ends_at con el tiempo (ej.
// un cron que se rompe y nunca lo pone en false). Con una función pura acá,
// el estado siempre es un cálculo fresco a partir de la fecha real.

export type SubscriptionStatus =
  | { kind: 'trial_active'; daysLeft: number }
  | { kind: 'trial_expired' }
  | { kind: 'paid'; plan: string }

const TRIAL_DAYS = 7

export function getSubscriptionStatus(org: { plan: string; trial_ends_at: string | null }): SubscriptionStatus {
  if (org.plan !== 'trial') return { kind: 'paid', plan: org.plan }

  // Sin fecha seteada (no debería pasar si createOrganizationAction la
  // arranca siempre, pero cubre datos viejos/manuales): se trata como
  // recién empezado en vez de bloquear a alguien por un dato faltante.
  if (!org.trial_ends_at) return { kind: 'trial_active', daysLeft: TRIAL_DAYS }

  const endsAt = new Date(org.trial_ends_at)
  const now = new Date()
  if (endsAt <= now) return { kind: 'trial_expired' }

  const daysLeft = Math.max(1, Math.ceil((endsAt.getTime() - now.getTime()) / 86400000))
  return { kind: 'trial_active', daysLeft }
}

export function trialEndsAtFromNow(): string {
  return new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString()
}
