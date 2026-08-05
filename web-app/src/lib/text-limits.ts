// Límites globales de texto (hotfix de seguridad, 2026-08-06) — ningún
// campo de texto de la plataforma puede ser ilimitado. Un solo lugar para
// los dos números, compartido por los `maxLength` del lado del cliente
// (cosmético, el browser no deja tipear de más) y el `clamp()` server-side
// de los Server Actions (la parte que de verdad importa: nadie puede
// mandar más de esto a la base aunque arme el FormData a mano).
export const TITLE_MAX_LENGTH = 100
export const TEXT_MAX_LENGTH = 2200

export function clamp(value: string, maxLength: number): string {
  return value.slice(0, maxLength)
}
