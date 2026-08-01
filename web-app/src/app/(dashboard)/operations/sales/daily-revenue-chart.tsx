import type { DailySalesPoint } from '@/lib/tiendanube/orders'

// Facturación Diaria — barras hand-rolled (bruto de fondo, neto encima), sin
// librería de gráficos. El tooltip usa group-hover puro CSS, no necesita
// 'use client'.

function money(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

export function DailyRevenueChart({ data }: { data: DailySalesPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Facturación Diaria</p>
        <p className="mt-6 text-center text-xs text-text-3">Sin órdenes en el período.</p>
      </div>
    )
  }

  const max = Math.max(...data.map((d) => d.bruto), 1)

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Facturación Diaria</p>
        <div className="flex items-center gap-3 text-[10px] text-text-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-accent/30" /> Bruto
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-accent" /> Neto
          </span>
        </div>
      </div>
      <div className="flex h-[140px] items-end gap-1">
        {data.map((d) => (
          <div key={d.date} className="group relative h-full flex-1">
            <div className="absolute bottom-0 w-full rounded-t-sm bg-accent/25" style={{ height: `${(d.bruto / max) * 100}%` }} />
            <div
              className="absolute bottom-0 w-full rounded-t-sm bg-accent"
              style={{ height: `${Math.max(0, (d.neto / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-control border border-border-2 bg-surface px-2 py-1 text-[10px] text-text group-hover:block">
              {d.date} — {money(d.neto)} neto
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[9px] text-text-3">
        <span>{data[0].date}</span>
        {data.length > 1 && <span>{data[data.length - 1].date}</span>}
      </div>
    </div>
  )
}
