'use client'

import { useState } from 'react'

// Hotfix de seguridad/escalabilidad (2026-08-06): ningún campo de texto de
// la plataforma puede ser ilimitado — este componente es el reemplazo
// drop-in de <textarea> para TODOS los formularios (Contenido, Campañas,
// Notas, Guiones, Meta Ads, Ajustes, Onboarding), con el límite real
// (`maxLength`, que el browser ya no deja tipear de más) y el contador
// visible "150 / 2200" pedido explícitamente. El límite real de verdad —
// la parte de "seguridad" — se refuerza en el server (ver `clamp` en los
// Server Actions correspondientes), porque un maxLength de HTML es
// cosmético: cualquiera puede mandar un FormData armado a mano sin pasar
// por el input.
export function CharCounterTextarea({
  name,
  defaultValue,
  maxLength,
  rows = 3,
  placeholder,
  className,
  required,
}: {
  name: string
  defaultValue?: string | null
  maxLength: number
  rows?: number
  placeholder?: string
  className?: string
  required?: boolean
}) {
  const [value, setValue] = useState(defaultValue ?? '')

  return (
    <div className="flex flex-col gap-1">
      <textarea
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={maxLength}
        className={className}
      />
      <span className="self-end text-[10px] tabular-nums text-text-3">
        {value.length} / {maxLength}
      </span>
    </div>
  )
}
