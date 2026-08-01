'use client'

import { useCurrency } from '@/lib/context/currency-context'

// Mismo lenguaje visual que ThemeToggle (mismo archivo hermano) — acá no
// hace falta ícono, "ARS"/"USD" ya es inequívoco por sí solo, a diferencia
// de un ícono de automatización que sí necesitaba la palabra al lado.
export function CurrencyToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { displayCurrency, toggleCurrency } = useCurrency()

  return (
    <button
      type="button"
      onClick={toggleCurrency}
      title={collapsed ? `Moneda: ${displayCurrency}` : undefined}
      className={`mb-2 flex w-full items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] py-2 text-white/60 outline-none transition-colors duration-200 ease-out hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/50 ${
        collapsed ? 'px-0' : 'px-3'
      }`}
    >
      {collapsed ? (
        <span className="text-[10px] font-bold">{displayCurrency}</span>
      ) : (
        <span className="text-xs font-semibold">Moneda: {displayCurrency}</span>
      )}
    </button>
  )
}
