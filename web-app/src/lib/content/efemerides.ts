// Efemérides comerciales (reestructuración de Contenido, 2026-08-05) —
// portado de app.html:14650-14688 (getFechasComercialesAR, recuperado del
// historial de git tras la limpieza del monolito legado, commit
// 0655cee~1). JSON/lógica estática a propósito: son fechas de calendario
// argentino, no dependen de ninguna tabla — pedirlas a Supabase sería un
// viaje de red por algo que nunca cambia por organización.

export type FechaComercial = { date: string; nombre: string }

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  // month: 1-12, weekday: 0=domingo..6=sábado
  const first = new Date(year, month - 1, 1)
  const day = 1 + ((7 + weekday - first.getDay()) % 7) + (n - 1) * 7
  return new Date(year, month - 1, day)
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month, 0)
  const diff = (last.getDay() - weekday + 7) % 7
  return new Date(year, month - 1, last.getDate() - diff)
}

function fechaISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const FIJAS: { md: string; nombre: string }[] = [
  { md: '01-06', nombre: 'Día de Reyes' },
  { md: '02-14', nombre: 'San Valentín' },
  { md: '03-08', nombre: 'Día de la Mujer' },
  { md: '05-01', nombre: 'Día del Trabajador' },
  { md: '06-20', nombre: 'Día de la Bandera' },
  { md: '07-09', nombre: 'Día de la Independencia' },
  { md: '07-20', nombre: 'Día del Amigo' },
  { md: '10-31', nombre: 'Halloween' },
  { md: '12-24', nombre: 'Nochebuena' },
  { md: '12-25', nombre: 'Navidad' },
]

export function getFechasComercialesAR(year: number): FechaComercial[] {
  const fijas = FIJAS.map((f) => ({ date: `${year}-${f.md}`, nombre: f.nombre }))

  const diaPadre = nthWeekdayOfMonth(year, 6, 0, 3)
  const diaNino = nthWeekdayOfMonth(year, 8, 0, 3)
  const diaMadre = nthWeekdayOfMonth(year, 10, 0, 3)
  const blackFriday = lastWeekdayOfMonth(year, 11, 5)
  const cyberMonday = new Date(blackFriday)
  cyberMonday.setDate(blackFriday.getDate() + 3)

  const moviles: FechaComercial[] = [
    { date: fechaISO(diaPadre), nombre: 'Día del Padre' },
    { date: fechaISO(diaNino), nombre: 'Día del Niño' },
    { date: fechaISO(diaMadre), nombre: 'Día de la Madre' },
    { date: fechaISO(blackFriday), nombre: 'Black Friday' },
    { date: fechaISO(cyberMonday), nombre: 'Cyber Monday' },
  ]

  return [...fijas, ...moviles].sort((a, b) => a.date.localeCompare(b.date))
}
