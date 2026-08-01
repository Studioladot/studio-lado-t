// Nivel de rol de organización (P2, auditoría de cierre, 2026-07-30) — antes
// solo existían 'owner'/'member' en la práctica (ver team/page.tsx), sin
// forma de delegar gestión de equipo a alguien que no sea el dueño. 'admin'
// es el nivel intermedio: lo asigna el dueño (updateMemberRoleAction, RPC
// update_member_role — ver migración 20260802120000), nunca se auto-asigna.
//
// invite_member_by_email/remove_member son 2 RPC ya existentes en la base
// pero NO versionadas en este repo (ver auditoría de seguridad, "~45 tablas
// sin migración") — no se pudo confirmar si ya aceptan 'admin' como llamador
// válido o si hoy exigen 'owner' a secas. Hasta confirmarlo/extenderlas,
// invitar/quitar miembros sigue siendo exclusivo del dueño en la UI
// (team/page.tsx) — promover/degradar a Admin es la única acción que un
// Admin desbloquea por ahora, vía la función nueva de arriba, que si es
// propia de este cambio y sí se audita acá.
export type OrganizationRole = 'owner' | 'admin' | 'member'

export const ROLE_LABEL: Record<OrganizationRole, string> = {
  owner: 'Dueño',
  admin: 'Admin',
  member: 'Miembro',
}

export function roleLabel(role: string | null | undefined): string {
  if (role === 'owner' || role === 'admin' || role === 'member') return ROLE_LABEL[role]
  return role ?? ''
}
