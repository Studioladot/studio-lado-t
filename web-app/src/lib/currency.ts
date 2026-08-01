import type { MetricColumnId } from '@/app/(dashboard)/meta-ads/campaigns/metric-defs'

export type Currency = 'ARS' | 'USD'

type DolarApiEntry = { casa: string; compra: number; venta: number }

/**
 * Cotización USD→ARS real: dolarapi.com, tasa "cripto" (venta) — el Dólar
 * Cripto/Digital (USDC), pedido explícito del usuario (2026-07-24: "tarjeta"
 * quedaba muy por encima del valor real de mercado — confirmado contra la
 * API en vivo, tarjeta ~1970 vs cripto ~1580, y el segundo es el que coincide
 * con la referencia real que tenía el usuario). Ya no sigue el criterio
 * original del legado (que usaba "tarjeta", app.html:13210-13216) — este es
 * un cambio deliberado sobre ese precedente, no un error de puerto.
 *
 * Cacheada por Next (revalidate 1h): el fetch real a dolarapi.com pasa como
 * mucho una vez por hora para TODA la app, no por usuario ni por request —
 * ver la sección de arquitectura del plan. Nunca inventa un número: si el
 * fetch falla, devuelve null y quien la consume debe degradar con gracia
 * (no convertir) en vez de mostrar una cifra inventada.
 */
export async function getUsdArsRate(): Promise<number | null> {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares', { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = (await res.json()) as DolarApiEntry[]
    const cripto = data.find((d) => d.casa === 'cripto')
    return cripto?.venta && cripto.venta > 0 ? cripto.venta : null
  } catch {
    return null
  }
}

/** Identidad si from===to; si no y no hay tasa disponible, devuelve el monto sin convertir (nunca simula una tasa). */
export function convertAmount(amount: number, from: Currency, to: Currency, usdArsRate: number | null): number {
  if (from === to) return amount
  if (usdArsRate === null) return amount
  return from === 'USD' && to === 'ARS' ? amount * usdArsRate : amount / usdArsRate
}

/** Mismo criterio que el formateo del legado: US$ para dólares, $ para pesos. */
export function formatMoney(amount: number, currency: Currency, decimals = 0): string {
  const prefix = currency === 'USD' ? 'US$' : '$'
  return `${prefix}${amount.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

/**
 * Qué columnas de metric-defs.tsx son plata de verdad — el resto (ROAS,
 * CTR, Frecuencia, Hook Rate, Compras, Impresiones, Clics, IC, ATC) son
 * ratios o conteos, convertirlos sería matemáticamente incorrecto (o
 * directamente no son montos).
 */
export const MONETARY_METRIC_IDS: ReadonlySet<MetricColumnId> = new Set<MetricColumnId>([
  'spend',
  'cpa',
  'cpm',
  'cpc',
  'costPerIC',
  'costPerATC',
  'conversionValue',
  'aov',
])
