// Validación de auto-publicación compartida entre campaigns/[id]/actions.ts
// (piezas) y content/actions.ts (publicaciones sueltas) — antes vivía
// duplicada solo en piezas; se extrae acá para que ambas formas de
// contenido programen exactamente igual, sin manejar la fecha dos veces.

export type ScheduledAtResult = { iso: string | null; error: string | null }

/**
 * `scheduled_at` viene de un <input type="datetime-local"> — sin zona
 * horaria, se interpreta en la hora local del navegador. Devuelve
 * `{ iso: null, error: null }` si el checkbox de auto-publicación no está
 * tildado (no es un error, simplemente no se programa nada).
 *
 * `prefix` (Épica Omnicanal, 2026-08-04): por default lee `schedule_enabled`/
 * `scheduled_at` (Instagram, nombres originales, sin tocar para no romper
 * ningún form existente) — con `'tiktok_'` lee `tiktok_schedule_enabled`/
 * `tiktok_scheduled_at`, mismos campos que la pestaña "Configuración
 * TikTok" del form. Misma validación para las dos redes, un solo lugar.
 */
export function parseScheduledAt(formData: FormData, prefix: '' | 'tiktok_' = ''): ScheduledAtResult {
  const enabled = formData.get(`${prefix}schedule_enabled`) === 'on'
  if (!enabled) return { iso: null, error: null }

  const raw = String(formData.get(`${prefix}scheduled_at`) ?? '')
  if (!raw) return { iso: null, error: 'Elegí fecha y hora para la auto-publicación.' }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return { iso: null, error: 'La fecha de programación no es válida.' }
  if (date.getTime() <= Date.now()) return { iso: null, error: 'La fecha de programación tiene que ser en el futuro.' }

  return { iso: date.toISOString(), error: null }
}
