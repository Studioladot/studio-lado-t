// Estilo compartido para los botones secundarios de acción (Ver/Editar/
// Borrar) en forma de pastilla compacta (pulido UX/UI, 2026-08-06) — antes
// cada lista los pintaba como texto plano sin fondo, difícil de reconocer
// como interactivo a simple vista. Un solo lugar para el look, en vez de
// repetir la misma clase larga en cada archivo que los usa.

const PILL_BASE =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150 ease-out disabled:cursor-wait disabled:opacity-60'

const PILL_VARIANT = {
  neutral: 'bg-surface-2/70 text-text-2 hover:bg-surface-2 hover:text-text',
  danger: 'bg-red/[0.07] text-red hover:bg-red/[0.14]',
  accent: 'bg-accent/[0.08] text-accent hover:bg-accent/[0.14]',
} as const

export type PillVariant = keyof typeof PILL_VARIANT

export function pillClass(variant: PillVariant = 'neutral', extra = '') {
  return `${PILL_BASE} ${PILL_VARIANT[variant]} ${extra}`.trim()
}

export function MiniSpinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="11" height="11" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
