'use client'

import { useState, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

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
//
// Hotfix de seguridad/UI (2026-08-06): con `maxLength` seteado, aparece el
// contador "150 / 2200" pedido para TODOS los textareas de la plataforma —
// al vivir acá (el primitivo compartido por ~10 formularios), el contador
// se propaga a todos con un solo cambio en vez de tener que tocar cada
// formulario a mano. Sin `maxLength`, se comporta exactamente igual que
// antes (compatibilidad con los pocos casos que todavía no lo usan).
export function TextArea({ className, maxLength, defaultValue, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [value, setValue] = useState(typeof defaultValue === 'string' ? defaultValue : '')

  if (maxLength == null) {
    return <textarea {...props} defaultValue={defaultValue} className={cx(BASE_FIELD_CLASS, 'resize-none', className)} />
  }

  return (
    <div className="flex flex-col gap-1">
      <textarea
        {...props}
        maxLength={maxLength}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cx(BASE_FIELD_CLASS, 'resize-none', className)}
      />
      <span className="self-end text-[10px] tabular-nums text-text-3">
        {value.length} / {maxLength}
      </span>
    </div>
  )
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(BASE_FIELD_CLASS, className)} />
}
