'use client'

import { useState, type ReactNode } from 'react'
import { saveBenchmarksAction } from './actions'
import type { MetricBenchmarks } from '@/lib/meta/benchmarks'

// Tabla de referencia portada 1:1 desde app.html:2052-2075 ("Benchmarks —
// Ecommerce de moda, Argentina") — son puntos de partida de industria, no
// reglas absolutas. 4 niveles de color en vez de los 3 (verde/ámbar/rojo)
// que usa el resto de la app porque acá el legado sí distingue "Bueno" de
// "Excelente" — se le suma el azul de accent/primary para ese 4to nivel.

const TIER_CLASS: Record<'excelente' | 'bueno' | 'revisar' | 'critico', string> = {
  excelente: 'border-green/40 bg-green/[8%] text-green',
  bueno: 'border-accent/40 bg-accent/[8%] text-accent',
  revisar: 'border-amber/40 bg-amber/[8%] text-amber',
  critico: 'border-red/40 bg-red/[8%] text-red',
}

function Tier({ tier, children }: { tier: keyof typeof TIER_CLASS; children: ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TIER_CLASS[tier]}`}>
      {children}
    </span>
  )
}

const REFERENCE_ROWS: {
  metric: string
  sub: string
  excelente: string
  bueno: string
  revisar: string
  critico: string
  what: string
}[] = [
  {
    metric: 'Hook Rate',
    sub: '3s / Impresiones',
    excelente: '>4%',
    bueno: '3-4%',
    revisar: '2-3%',
    critico: '<2%',
    what: 'Si tu hook frena el scroll en los primeros 3 segundos',
  },
  {
    metric: 'Thumbstop',
    sub: 'P25 / Impresiones',
    excelente: '>35%',
    bueno: '25-35%',
    revisar: '15-25%',
    critico: '<15%',
    what: 'Cuánta gente llega al 25% del video',
  },
  {
    metric: 'Hold Rate',
    sub: 'P100 / Impresiones',
    excelente: '>15%',
    bueno: '10-15%',
    revisar: '5-10%',
    critico: '<5%',
    what: 'Retención total — si el video engancha de principio a fin',
  },
  {
    metric: 'CTR (link)',
    sub: 'Clicks / Impresiones',
    excelente: '>2%',
    bueno: '1.5-2%',
    revisar: '1-1.5%',
    critico: '<1%',
    what: 'Cuánta gente hace click para ir a la web',
  },
  {
    metric: 'CPM (USD)',
    sub: 'Costo / 1000 impr.',
    excelente: '<$0.80',
    bueno: '$0.80-1.50',
    revisar: '$1.50-3',
    critico: '>$3',
    what: 'Costo de llegar a 1000 personas',
  },
  {
    metric: 'CPC (USD)',
    sub: 'Costo por click',
    excelente: '<$0.05',
    bueno: '$0.05-0.10',
    revisar: '$0.10-0.20',
    critico: '>$0.20',
    what: 'Costo de traer a alguien a tu web',
  },
  {
    metric: 'ROAS',
    sub: 'Ventas / Gasto',
    excelente: '>4x',
    bueno: '2-4x',
    revisar: '1.5-2x',
    critico: '<1.5x',
    what: 'Retorno sobre la inversión en ads',
  },
  {
    metric: 'Frecuencia',
    sub: 'Impr. / Reach',
    excelente: '1-1.5',
    bueno: '1.5-2.5',
    revisar: '2.5-4',
    critico: '>4',
    what: 'Cuántas veces ve el mismo anuncio una persona',
  },
  {
    metric: 'CPA (ARS)',
    sub: 'Costo por compra',
    excelente: '<$8K',
    bueno: '$8K-15K',
    revisar: '$15K-25K',
    critico: '>$25K',
    what: 'Cuánto cuesta conseguir una venta',
  },
]

const BREAKEVEN_ROW = {
  metric: 'ROAS Breakeven',
  sub: 'Punto de equilibrio',
  mid: '2x (margen ~49%)',
  critico: '<2x',
  what: 'Con margen del 49%, menos de 2x = pérdida neta',
}

const QUICK_GUIDE: { tone: 'red' | 'amber' | 'green'; title: string; body: string }[] = [
  { tone: 'red', title: 'Hook Rate <2%', body: 'El primer segundo no frena el scroll. Cambiar apertura del video.' },
  { tone: 'red', title: 'CTR <1% con Hook >3%', body: 'Video engancha pero no convierte. Problema en el CTA o la promesa.' },
  { tone: 'amber', title: 'Frecuencia >3.5', body: 'Saturación. Meter creativos nuevos antes de subir presupuesto.' },
  { tone: 'green', title: 'ROAS >4x por 7+ días', body: 'Momento de escalar. Duplicar presupuesto del conjunto. Esperar 72hs.' },
]

const GUIDE_TONE_CLASS: Record<string, string> = {
  red: 'border-red/30 bg-red/[6%] text-red',
  amber: 'border-amber/30 bg-amber/[6%] text-amber',
  green: 'border-green/30 bg-green/[6%] text-green',
}

const TARGET_FIELDS: { key: keyof MetricBenchmarks; label: string; placeholder: string }[] = [
  { key: 'hookRateTarget', label: 'Hook Rate objetivo (%)', placeholder: '3' },
  { key: 'ctrTarget', label: 'CTR objetivo (%)', placeholder: '1.5' },
  { key: 'roasMin', label: 'ROAS mínimo (x)', placeholder: '2' },
  { key: 'roasTarget', label: 'ROAS objetivo (x)', placeholder: '4' },
  { key: 'cpaMax', label: 'CPA máximo (ARS)', placeholder: '15000' },
  { key: 'cpmMax', label: 'CPM máximo (USD)', placeholder: '1.5' },
  { key: 'freqMax', label: 'Frecuencia máxima', placeholder: '3' },
  { key: 'p25Target', label: 'P25 objetivo (%)', placeholder: '30' },
  { key: 'p100Target', label: 'P100 objetivo (%)', placeholder: '10' },
]

export function BenchmarksForm({ initialBenchmarks }: { initialBenchmarks: MetricBenchmarks }) {
  const [values, setValues] = useState(initialBenchmarks)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function setField(key: keyof MetricBenchmarks, raw: string) {
    setValues((prev) => ({ ...prev, [key]: raw === '' ? null : Number(raw) }))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const result = await saveBenchmarksAction(values)
    setSaving(false)
    if (result.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border border-border bg-surface p-5">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-text-3">Tabla de referencia — Meta Ads</p>
        <p className="mb-4 text-xs text-text-2">Ecommerce de moda, Argentina — puntos de partida, no reglas absolutas.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-bold uppercase tracking-wide text-text-3">
                <th className="py-2 pr-3">Métrica</th>
                <th className="px-3 py-2">Excelente</th>
                <th className="px-3 py-2">Bueno</th>
                <th className="px-3 py-2">Revisar</th>
                <th className="px-3 py-2">Crítico</th>
                <th className="py-2 pl-3">Qué mide</th>
              </tr>
            </thead>
            <tbody>
              {REFERENCE_ROWS.map((row) => (
                <tr key={row.metric} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3">
                    <p className="whitespace-nowrap font-semibold text-text">{row.metric}</p>
                    <p className="whitespace-nowrap text-[11px] text-text-3">{row.sub}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <Tier tier="excelente">{row.excelente}</Tier>
                  </td>
                  <td className="px-3 py-2.5">
                    <Tier tier="bueno">{row.bueno}</Tier>
                  </td>
                  <td className="px-3 py-2.5">
                    <Tier tier="revisar">{row.revisar}</Tier>
                  </td>
                  <td className="px-3 py-2.5">
                    <Tier tier="critico">{row.critico}</Tier>
                  </td>
                  <td className="py-2.5 pl-3 text-xs text-text-2">{row.what}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2.5 pr-3">
                  <p className="whitespace-nowrap font-semibold text-text">{BREAKEVEN_ROW.metric}</p>
                  <p className="whitespace-nowrap text-[11px] text-text-3">{BREAKEVEN_ROW.sub}</p>
                </td>
                <td className="px-3 py-2.5 text-center" colSpan={3}>
                  <Tier tier="bueno">{BREAKEVEN_ROW.mid}</Tier>
                </td>
                <td className="px-3 py-2.5">
                  <Tier tier="critico">{BREAKEVEN_ROW.critico}</Tier>
                </td>
                <td className="py-2.5 pl-3 text-xs text-text-2">{BREAKEVEN_ROW.what}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Mis targets personalizados</p>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="rounded-control bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 ease-out hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {TARGET_FIELDS.map((field) => (
              <label key={field.key} className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-text-2">{field.label}</span>
                <input
                  type="number"
                  step="any"
                  value={values[field.key] ?? ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-28 rounded-control border border-border bg-surface-2/60 px-2.5 py-1.5 text-right text-xs text-text outline-none transition-all duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent"
                />
              </label>
            ))}
          </div>
          {saved && <p className="mt-2 text-[11px] text-text-2">Guardado.</p>}
        </div>

        <div className="rounded-card border border-border bg-surface p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Guía rápida</p>
          <div className="flex flex-col gap-2.5">
            {QUICK_GUIDE.map((item) => (
              <div key={item.title} className={`rounded-control border p-3 ${GUIDE_TONE_CLASS[item.tone]}`}>
                <p className="text-xs font-bold">{item.title}</p>
                <p className="mt-0.5 text-xs text-text-2">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
