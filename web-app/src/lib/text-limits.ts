// Límites globales de texto (hotfix de seguridad, 2026-08-06) — ningún
// campo de texto de la plataforma puede ser ilimitado. Un solo lugar para
// los dos números, compartido por los `maxLength` del lado del cliente
// (cosmético, el browser no deja tipear de más) y el `clamp()` server-side
// de los Server Actions (la parte que de verdad importa: nadie puede
// mandar más de esto a la base aunque arme el FormData a mano).
export const TITLE_MAX_LENGTH = 100
export const TEXT_MAX_LENGTH = 2200

// Bug real reportado (2026-08-06): esta función corre server-side sobre
// datos que, en la práctica, no siempre son el `string` que el tipo
// promete — un FormData con el campo ausente, o un valor que llegó null
// desde otro punto de la cadena, tira TypeError sobre `.slice` y tumba la
// ruta entera. Se acepta explícitamente cualquier cosa y se normaliza
// antes de tocar un método de string.
export function clamp(value: string | null | undefined, maxLength: number): string {
  return String(value ?? '').slice(0, maxLength)
}
