// Tokens compartidos por todo el wizard "Lanzar Testeo" — antes cada archivo
// tenía su propia copia hardcodeada en hex claro (#F9FAFB/#101828), lo que
// rompía en modo oscuro (quedaban cajas blancas encima de un fondo oscuro).
// Una sola fuente de verdad usando los tokens de globals.css evita que vuelva
// a pasar.
export const fieldClass =
  'rounded-control border border-border-2 bg-surface-2 px-3 py-2.5 text-sm text-text outline-none transition-all duration-200 ease-out placeholder:text-text-3 focus-visible:ring-2 focus-visible:ring-accent'
export const labelClass = 'text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'
export const toggleBase = 'rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out'
