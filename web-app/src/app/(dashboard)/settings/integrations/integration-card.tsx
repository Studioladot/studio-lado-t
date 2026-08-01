'use client'

import { useState, type ReactNode } from 'react'

// Hub de Integraciones (2026-08-05) — shell genérico estilo Zapier/Make:
// tarjeta chica por defecto (logo + nombre + descripción + estado), la
// única interactividad propia de este componente es el toggle de
// "Administrar" (expandir/colapsar el panel de detalle). El contenido real
// —forms atados a Server Actions, health checks, permisos— vive en
// page.tsx (Server Component) y llega acá como children ya renderizados en
// el servidor; este componente nunca los inspecciona ni los clona, solo los
// ubica en el slot correspondiente.
export function IntegrationCard({
  icon,
  name,
  description,
  connected,
  statusLabel,
  disabled,
  disabledReason,
  connectSlot,
  manageSlot,
}: {
  icon: ReactNode
  name: string
  description: string
  connected: boolean
  statusLabel?: string
  disabled?: boolean
  disabledReason?: string
  connectSlot?: ReactNode
  manageSlot?: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`overflow-hidden rounded-card border bg-surface transition-colors duration-200 ease-out ${
        disabled ? 'border-dashed border-border' : 'border-border'
      }`}
    >
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-2">
            {icon}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              disabled
                ? 'bg-surface-2 text-text-3'
                : connected
                  ? 'bg-green/[0.12] text-green'
                  : 'bg-surface-2 text-text-3'
            }`}
          >
            {disabled ? 'Próximamente' : connected ? (statusLabel ?? 'Conectado') : 'Sin conectar'}
          </span>
        </div>

        <div>
          <p className="text-sm font-semibold text-text">{name}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-text-2">{disabled ? (disabledReason ?? description) : description}</p>
        </div>

        {!disabled && (
          <div className="mt-1">
            {connected ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-center gap-1.5 rounded-control border border-border px-3 py-2 text-xs font-semibold text-text-2 transition-colors duration-200 ease-out hover:border-text-3 hover:text-text"
              >
                Administrar
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`shrink-0 transition-transform duration-200 ease-out ${expanded ? 'rotate-90' : ''}`}
                >
                  <path d="M3.5 2.5l4 2.5-4 2.5" />
                </svg>
              </button>
            ) : (
              connectSlot
            )}
          </div>
        )}
      </div>

      {connected && manageSlot && (
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border bg-surface-2/40 p-5">{manageSlot}</div>
          </div>
        </div>
      )}
    </div>
  )
}
