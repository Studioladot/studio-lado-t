'use client'

import { useState } from 'react'

// Hotfix UI premium (2026-08-06): texto largo en tarjetas (notas, copy,
// descripciones) generaba scroll infinito — se corta a N líneas con
// line-clamp y un toggle sutil "Ver más/Ver menos" para expandir solo si
// el usuario lo pide. El botón solo se muestra si el texto es lo
// bastante largo como para necesitar recorte de verdad (heurística por
// longitud — medir overflow real requeriría un ResizeObserver por tarjeta,
// desproporcionado acá).
const CLAMP_CLASS: Record<2 | 3 | 4, string> = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
}

const APPROX_CHARS_PER_LINE = 70

export function ExpandableText({
  text,
  lines = 3,
  className,
}: {
  text: string
  lines?: 2 | 3 | 4
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const needsClamp = text.length > lines * APPROX_CHARS_PER_LINE

  return (
    <div>
      <p className={`whitespace-pre-wrap ${expanded || !needsClamp ? '' : CLAMP_CLASS[lines]} ${className ?? ''}`}>{text}</p>
      {needsClamp && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-[11px] font-semibold text-accent transition-colors duration-200 ease-out hover:text-accent/80"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  )
}
