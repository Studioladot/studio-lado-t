// Fuente única de verdad para colores y categorías de Notas (limpieza de
// cierre de Fase 1, 2026-08-06) — antes NOTE_COLORS/COLORS/BORDER_COLOR y
// CATEGORIES/FILTERS/CATEGORY_LABEL estaban duplicados/derivados a mano en
// actions.ts, note-form.tsx y notes-grid.tsx (hasta 3 copias del mismo
// array de 6 hex). Un solo lugar para editar si algún día cambia un color
// o se agrega una categoría.
//
// Paleta fija tipo post-it, no son tokens del tema (mismo criterio ya
// documentado antes de esta limpieza) — las notas siempre usan estos 6
// pasteles claros, en claro y en oscuro.

export const NOTE_COLORS: string[] = ['#fef3d8', '#fbe8e3', '#e8f2f0', '#e4f0fb', '#e4f5e7', '#f0efec']

/** Acento (borde superior de la tarjeta) derivado de cada color de fondo. */
export const NOTE_COLOR_ACCENT: Record<string, string> = {
  '#fef3d8': '#c9a227',
  '#fbe8e3': '#b03311',
  '#e8f2f0': '#6fa398',
  '#e4f0fb': '#1a5fa5',
  '#e4f5e7': '#2d7a3a',
  '#f0efec': '#c8c6c0',
}

export type NoteCategory = 'fechas' | 'conceptos' | 'varios'

export const NOTE_CATEGORIES: Array<{ value: NoteCategory; label: string }> = [
  { value: 'varios', label: 'Varios' },
  { value: 'fechas', label: 'Fechas importantes' },
  { value: 'conceptos', label: 'Conceptos claves' },
]

export const NOTE_CATEGORY_VALUES: string[] = NOTE_CATEGORIES.map((c) => c.value)

export const NOTE_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  NOTE_CATEGORIES.map((c) => [c.value, c.label])
)
