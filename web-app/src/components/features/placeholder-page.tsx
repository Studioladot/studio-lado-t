import type { ReactNode } from 'react'

export function PlaceholderPage({
  title,
  subtitle,
  icon,
}: {
  title: string
  subtitle: string
  icon: ReactNode
}) {
  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">{title}</h1>
        <p className="mt-0.5 text-[13px] text-text-2">{subtitle}</p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-6 py-20 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-glow text-primary">
          {icon}
        </span>
        <p className="text-sm font-medium text-text">Próximamente</p>
        <p className="max-w-[320px] text-xs text-text-2">
          Esta sección todavía no está construida — es un placeholder del esqueleto de navegación.
        </p>
      </div>
    </div>
  )
}
