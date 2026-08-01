'use client'

// Moneda de visualización global — mismo patrón useSyncExternalStore +
// localStorage + evento custom que ya usan ThemeToggle/DashboardShell
// (theme-toggle.tsx, dashboard-shell.tsx), envuelto acá en un Context
// porque esta vez hay muchos consumidores (cada celda monetaria de las
// tablas de Meta Ads + la Calculadora de Unit Economics), no un solo botón.
//
// El valor inicial (antes de que el usuario toque el switch) es la moneda
// real de la cuenta de Meta conectada — no USD fijo — resuelta server-side
// en (dashboard)/layout.tsx junto con la cotización, para que el primer
// render ya tenga todo sin un fetch propio del lado del cliente.

import { createContext, useContext, useCallback, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import type { Currency } from '@/lib/currency'

const CURRENCY_STORAGE_KEY = 'gotix_currency'
const CURRENCY_CHANGE_EVENT = 'gotix-currency-change'

interface CurrencyContextValue {
  /** Moneda que se está mostrando ahora mismo — la afecta el switch global. */
  displayCurrency: Currency
  toggleCurrency: () => void
  /** Cotización USD→ARS (tasa "cripto"/Dólar Digital de dolarapi.com) — null si no se pudo obtener, nunca inventada. */
  usdArsRate: number | null
  /** Moneda real de la cuenta de Meta conectada — el dato "de verdad", no lo que el usuario eligió ver. */
  accountCurrency: Currency
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

function subscribe(callback: () => void) {
  window.addEventListener(CURRENCY_CHANGE_EVENT, callback)
  return () => window.removeEventListener(CURRENCY_CHANGE_EVENT, callback)
}

export function CurrencyProvider({
  initialAccountCurrency,
  initialUsdArsRate,
  children,
}: {
  initialAccountCurrency: Currency
  initialUsdArsRate: number | null
  children: ReactNode
}) {
  const getSnapshot = useCallback((): Currency => {
    const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY)
    return stored === 'ARS' || stored === 'USD' ? stored : initialAccountCurrency
  }, [initialAccountCurrency])

  const getServerSnapshot = useCallback((): Currency => initialAccountCurrency, [initialAccountCurrency])

  const displayCurrency = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggleCurrency = useCallback(() => {
    const next: Currency = displayCurrency === 'ARS' ? 'USD' : 'ARS'
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, next)
    window.dispatchEvent(new Event(CURRENCY_CHANGE_EVENT))
  }, [displayCurrency])

  const value = useMemo(
    () => ({ displayCurrency, toggleCurrency, usdArsRate: initialUsdArsRate, accountCurrency: initialAccountCurrency }),
    [displayCurrency, toggleCurrency, initialUsdArsRate, initialAccountCurrency]
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency debe usarse dentro de un CurrencyProvider')
  }
  return context
}
