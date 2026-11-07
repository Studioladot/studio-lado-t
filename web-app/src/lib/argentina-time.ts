// El servidor (Vercel) corre en UTC, pero los clientes venden en hora
// argentina (UTC-3 fijo, sin horario de verano). Sin esto, una venta de las
// 22 h queda contada en el día siguiente y "hoy" arranca a las 21 h de ayer.

const AR_OFFSET_MS = 3 * 60 * 60 * 1000

/** Día calendario (YYYY-MM-DD) en Argentina para un instante dado. */
export function arDateKey(value: string | Date): string {
  const ms = typeof value === 'string' ? new Date(value).getTime() : value.getTime()
  return new Date(ms - AR_OFFSET_MS).toISOString().slice(0, 10)
}

/** Medianoche de hoy en Argentina, como instante real. */
export function startOfTodayArgentina(now: Date = new Date()): Date {
  return new Date(`${arDateKey(now)}T00:00:00-03:00`)
}
