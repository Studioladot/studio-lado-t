export default function DashboardPage() {
  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Dashboard</h1>
          <p className="mt-0.5 text-[13px] text-text-2">Resumen de tu negocio</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            defaultValue="this_month"
            className="rounded-control border border-border bg-surface px-2.5 py-1.5 text-[13px] text-text outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="today">Hoy</option>
            <option value="yesterday">Ayer</option>
            <option value="last_7d">7 días</option>
            <option value="last_14d">14 días</option>
            <option value="last_30d">30 días</option>
            <option value="last_90d">90 días</option>
            <option value="this_month">Este mes</option>
            <option value="last_month">Mes pasado</option>
            <option value="maximum">Histórico</option>
          </select>
          <button
            type="button"
            className="rounded-control bg-primary px-[18px] py-[10px] text-[13px] font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover hover:shadow-[0_0_28px_var(--primary-glow),0_0_8px_rgba(45,91,138,0.2)] active:scale-[0.98]"
          >
            + Cargar métricas
          </button>
        </div>
      </div>

      <div className="dash-hero mb-3.5 grid gap-8 rounded-card p-7 md:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center">
          <div className="mb-2 text-[22px] font-extrabold tracking-[-0.03em] text-text">
            LA BASE DE TU NEGOCIO
          </div>
          <p className="mb-[18px] max-w-[380px] text-[13px] leading-relaxed text-[#5E5E5A]">
            Controlá tus anuncios, medí tus márgenes reales y escalá tu marca en un solo lugar.
          </p>
          <button
            type="button"
            className="w-fit rounded-control border border-primary/25 bg-transparent px-4 py-[9px] text-[13px] font-semibold text-primary shadow-[0_0_12px_rgba(45,91,138,0.1)] transition-all duration-200 ease-out hover:bg-primary/[6%] hover:shadow-[0_0_24px_rgba(45,91,138,0.2)] active:scale-[0.98]"
          >
            Ver recorrido
          </button>
        </div>

        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-control border border-[rgba(26,26,24,0.08)] bg-surface-2 shadow-[0_8px_32px_rgba(0,0,0,0.09)]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/40 bg-black/55 backdrop-blur-sm">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="#ffffff" aria-hidden="true">
                <path d="M3 1.5l13 7.5-13 7.5z" />
              </svg>
            </div>
          </div>
          <span className="absolute bottom-2.5 left-2.5 rounded-md border border-white/15 bg-black/65 px-2.5 py-0.5 text-[10px] font-medium text-[#F5F5F3] backdrop-blur-sm">
            Onboarding · 3:42
          </span>
        </div>
      </div>

      <p className="text-sm text-text-2">Placeholder — próximo módulo migrado va acá.</p>
    </div>
  )
}
