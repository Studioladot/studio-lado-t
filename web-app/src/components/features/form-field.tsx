import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

// El bug de colores hardcodeados en campos de formulario (#D0D5DD/#F9FAFB/
// #101828 en vez de los tokens de tema) se corrigió por separado, a mano,
// en varios formularios distintos — y volvió a aparecer cada vez que se
// creó uno nuevo, porque cada uno copiaba la clase en vez de reusar algo
// compartido (auditoría de cierre, 2026-07-30). Estos tres componentes son
// el reemplazo drop-in de <input>/<textarea>/<select>: ya traen el estilo
// correcto (tokens de tema, dark-mode-compatible) — no hay una clase que
// copiar mal.
const BASE_FIELD_CLASS =
  'rounded-control border border-border bg-surface-2/60 px-3 py-2.5 text-sm text-text outline-none transition-all duration-200 ease-out placeholder:text-text-3 focus:border-accent focus-visible:ring-2 focus-visible:ring-accent'

// Clase de label ya usada por la mayoría de los formularios del proyecto —
// se exporta para que un formulario nuevo no tenga que redefinirla, pero no
// es obligatoria: algunos formularios (ej. campaign-form.tsx) separan
// label/input en vez de envolver, y eso está bien.
export const FORM_LABEL_CLASS = 'flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

function cx(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ')
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(BASE_FIELD_CLASS, className)} />
}

// resize-none va por defecto porque los ~10 usos existentes en el proyecto
// nunca quisieron que el usuario redimensionara el textarea a mano.
export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(BASE_FIELD_CLASS, 'resize-none', className)} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(BASE_FIELD_CLASS, className)} />
}
