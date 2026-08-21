/** Bloque base para armar skeletons de loading.tsx — mismo tono que bg-surface-2, con pulso. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-control bg-surface-2 ${className}`} />
}

/** Fila de tiles tipo KPI (dashboard, sales, campañas) — n columnas separadas por línea, como los grids reales de la app. */
export function SkeletonKpiRow({ columns = 4 }: { columns?: number }) {
  return (
    <div
      className="grid gap-px overflow-hidden rounded-card border border-border bg-border"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="space-y-2 bg-surface p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

/** Card genérica con título + cuerpo — para reemplazar tablas, gráficos o listas mientras cargan. */
export function SkeletonCard({ lines = 4 }: { lines?: number }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <Skeleton className="mb-4 h-4 w-40" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  )
}

/** Grid de cards (campañas, guiones, publicaciones) — n columnas de cards chicas. */
export function SkeletonGrid({ count = 6, columns = 3 }: { count?: number; columns?: number }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-card border border-border bg-surface p-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}
