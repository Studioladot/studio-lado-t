'use client'

import { useId } from 'react'

// Puerto directo de anSparkSvg del legado (app.html:12800-12823) — línea +
// área con gradiente, sin librería, mismo criterio zero-dependencia que
// WaterfallChart/DailyRevenueChart. `isGood` decide el color (verde/rojo),
// no el signo de la serie — para métricas donde bajar es bueno (CPA,
// costos) el llamador ya invierte el sentido antes de pasarlo acá.
// `useId` en vez de Math.random() para el id del gradiente — react-hooks/
// purity no permite azar durante el render (mismo motivo que Date.now()
// en otros lados de esta sesión), y varias sparklines conviven en la misma
// pantalla así que el id sí tiene que ser único de verdad.

const WIDTH = 64
const HEIGHT = 22

export function Sparkline({ series, isGood = true }: { series: number[]; isGood?: boolean }) {
  const gradientId = `spark-${useId()}`

  if (series.length < 2) return null

  const pad = 2
  const max = Math.max(...series, 0.0001)
  const min = Math.min(...series, 0)
  const range = max - min || 1
  const stepX = (WIDTH - pad * 2) / (series.length - 1)

  const points = series.map((v, i) => {
    const x = pad + i * stepX
    const y = HEIGHT - pad - ((v - min) / range) * (HEIGHT - pad * 2)
    return [x, y] as const
  })

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${HEIGHT} L${points[0][0].toFixed(1)},${HEIGHT} Z`
  const color = isGood ? 'var(--green)' : 'var(--red)'

  return (
    <svg
      className="pointer-events-none absolute bottom-2.5 right-3 opacity-75"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
