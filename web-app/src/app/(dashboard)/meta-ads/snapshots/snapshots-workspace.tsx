'use client'

import { useEffect, useState } from 'react'
import { Select, TextInput } from '@/components/features/form-field'
import { formatMoney, type Currency } from '@/lib/currency'
import { listSnapshotEntitiesAction, getEntitySnapshotAction, type SnapshotEntityOption } from './actions'
import type { MetaEntityDailyInsightsResult, MetaEntityDailyPoint } from '@/lib/meta/campaigns'

// Snapshots Pro (2026-08-04) — rediseño pedido por la PO para media buyers
// avanzados: buscador instantáneo (sin scroll infinito en listas largas de
// anuncios), rango de fechas libre (no solo presets), matriz de
// comparación Día A vs Día B con deltas, y métricas más profundas por día
// (CTR/CPC/Frecuencia/Impresiones, además de CPA/ROAS/Ventas/Compras).

type Campaign = { id: string; name: string }
type Level = 'ad' | 'adset'

const PRESET_DAYS = [7, 14, 30]

function toDateInputValue(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatDateLabel(iso: string): string {
  const [, month, day] = iso.split('-')
  if (!month || !day) return iso
  return `${day}/${month}`
}

// Combobox con filtro instantáneo — reemplaza un <select> nativo cuando la
// lista puede tener decenas/cientos de opciones (anuncios de una campaña
// grande). Filtra en memoria sobre las opciones ya cargadas, sin pedir nada
// nuevo al servidor — la búsqueda es instantánea a propósito.
function SearchableSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string
  placeholder: string
  options: { id: string; name: string }[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.id === value)
  const filtered = query.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  return (
    <div className="relative flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">{label}</span>
      <TextInput
        type="text"
        disabled={disabled}
        value={open ? query : (selected?.name ?? '')}
        onFocus={() => {
          setOpen(true)
          setQuery('')
        }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="min-w-[220px]"
        autoComplete="off"
      />
      {open && (
        <div className="absolute top-full z-20 mt-1 max-h-64 w-full min-w-[240px] overflow-y-auto rounded-control border border-border bg-surface shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-text-3">Sin resultados.</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o.id)
                  setOpen(false)
                  setQuery('')
                }}
                className={`block w-full truncate px-3 py-2 text-left text-xs transition-colors duration-150 ease-out ${
                  o.id === value ? 'bg-accent/[0.08] text-accent' : 'text-text hover:bg-surface-2'
                }`}
              >
                {o.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ComparisonRow({
  label,
  a,
  b,
  format,
  invert,
}: {
  label: string
  a: number
  b: number
  format: (n: number) => string
  invert?: boolean
}) {
  const deltaAbs = b - a
  const deltaPct = a !== 0 ? (deltaAbs / Math.abs(a)) * 100 : null
  const flat = Math.abs(deltaAbs) < 0.005
  const improved = invert ? deltaAbs < 0 : deltaAbs > 0
  const tone = flat ? 'text-text-3' : improved ? 'text-green' : 'text-red'

  return (
    <tr className="border-t border-divider">
      <td className="px-4 py-2.5 font-medium text-text">{label}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-text-2">{format(a)}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-text-2">{format(b)}</td>
      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${tone}`}>
        {deltaAbs > 0 ? '+' : ''}
        {format(deltaAbs)}
      </td>
      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${tone}`}>
        {deltaPct === null ? '—' : `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%`}
      </td>
    </tr>
  )
}

export function SnapshotsWorkspace({
  campaigns,
  accountCurrency,
  initialCampaignId,
  initialSince,
  initialUntil,
}: {
  campaigns: Campaign[]
  accountCurrency: Currency
  initialCampaignId: string | null
  initialSince: string
  initialUntil: string
}) {
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? campaigns[0]?.id ?? '')
  const [level, setLevel] = useState<Level>('ad')
  const [entities, setEntities] = useState<SnapshotEntityOption[]>([])
  const [entitiesError, setEntitiesError] = useState<string | null>(null)
  // Arranca en true cuando hay campaña para no mostrar "esta campaña no
  // tiene anuncios" por un instante antes de que dispare el efecto de abajo.
  const [entitiesLoading, setEntitiesLoading] = useState(Boolean(initialCampaignId))
  const [entityId, setEntityId] = useState('')
  const [sinceInput, setSinceInput] = useState(initialSince)
  const [untilInput, setUntilInput] = useState(initialUntil)
  const [snapshot, setSnapshot] = useState<MetaEntityDailyInsightsResult | null>(null)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [dateRangeError, setDateRangeError] = useState<string | null>(null)

  // Día A / Día B — se guardan como fecha (no índice) para poder derivar el
  // default en cada render sin un useEffect: si la fecha guardada ya no
  // existe en el snapshot actual (cambió de entidad/rango), cae solita al
  // primer/último día disponible, sin sincronizar estado manualmente.
  const [dayAId, setDayAId] = useState<string | null>(null)
  const [dayBId, setDayBId] = useState<string | null>(null)

  async function loadSnapshot(nextEntityId: string, sinceISO: string, untilISO: string) {
    if (!nextEntityId) {
      setSnapshot(null)
      return
    }
    if (sinceISO > untilISO) {
      setDateRangeError('La fecha "desde" no puede ser posterior a "hasta".')
      return
    }
    setDateRangeError(null)
    setSnapshotLoading(true)
    const result = await getEntitySnapshotAction(nextEntityId, sinceISO, untilISO)
    setSnapshot(result)
    setSnapshotLoading(false)
  }

  async function loadEntities(nextCampaignId: string, nextLevel: Level) {
    setEntitiesLoading(true)
    setEntitiesError(null)
    setSnapshot(null)
    const result = await listSnapshotEntitiesAction(nextCampaignId, nextLevel)
    setEntitiesLoading(false)
    if (!result.ok) {
      setEntities([])
      setEntitiesError(result.error)
      setEntityId('')
      return
    }
    setEntities(result.entities)
    setEntitiesError(null)
    const nextEntityId = result.entities[0]?.id ?? ''
    setEntityId(nextEntityId)
    if (nextEntityId) await loadSnapshot(nextEntityId, sinceInput, untilInput)
  }

  // Fix de performance (2026-08-21, ver comentario en page.tsx): entidades +
  // historial de la primera campaña se piden acá, client-side apenas monta,
  // en vez de bloquear el Server Component con 2 llamadas más a la Graph
  // API antes del primer render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial intencional, mismo patrón que adsets-workspace.tsx.
    if (initialCampaignId) loadEntities(initialCampaignId, 'ad')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCampaignChange(nextCampaignId: string) {
    setCampaignId(nextCampaignId)
    await loadEntities(nextCampaignId, level)
  }

  async function handleLevelChange(nextLevel: Level) {
    setLevel(nextLevel)
    await loadEntities(campaignId, nextLevel)
  }

  async function handleEntityChange(nextEntityId: string) {
    setEntityId(nextEntityId)
    await loadSnapshot(nextEntityId, sinceInput, untilInput)
  }

  async function handlePreset(days: number) {
    const until = new Date()
    const since = new Date(until.getTime() - days * 86400000)
    const sinceISO = toDateInputValue(since)
    const untilISO = toDateInputValue(until)
    setSinceInput(sinceISO)
    setUntilInput(untilISO)
    if (entityId) await loadSnapshot(entityId, sinceISO, untilISO)
  }

  async function handleSinceChange(value: string) {
    setSinceInput(value)
    if (entityId && value) await loadSnapshot(entityId, value, untilInput)
  }

  async function handleUntilChange(value: string) {
    setUntilInput(value)
    if (entityId && value) await loadSnapshot(entityId, sinceInput, value)
  }

  const dayPoints: MetaEntityDailyPoint[] = snapshot?.ok ? snapshot.days : []
  const effectiveDayAId = (dayAId && dayPoints.some((d) => d.date === dayAId) ? dayAId : dayPoints[0]?.date) ?? ''
  const effectiveDayBId =
    (dayBId && dayPoints.some((d) => d.date === dayBId) ? dayBId : dayPoints[dayPoints.length - 1]?.date) ?? ''
  const dayA = dayPoints.find((d) => d.date === effectiveDayAId) ?? null
  const dayB = dayPoints.find((d) => d.date === effectiveDayBId) ?? null
  const money = (n: number) => formatMoney(n, accountCurrency)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface p-4">
        <SearchableSelect
          label="Campaña"
          placeholder="Buscar campaña…"
          options={campaigns}
          value={campaignId}
          onChange={handleCampaignChange}
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">Nivel</span>
          <Select value={level} onChange={(e) => handleLevelChange(e.target.value as Level)}>
            <option value="ad">Anuncio</option>
            <option value="adset">Conjunto</option>
          </Select>
        </label>

        <SearchableSelect
          label={level === 'ad' ? 'Anuncio' : 'Conjunto'}
          placeholder={`Buscar ${level === 'ad' ? 'anuncio' : 'conjunto'}…`}
          options={entities}
          value={entityId}
          onChange={handleEntityChange}
          disabled={entitiesLoading || entities.length === 0}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">Rango rápido</span>
          <div className="flex items-center gap-1.5 rounded-control border border-border bg-surface-2/60 p-1">
            {PRESET_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handlePreset(d)}
                className="rounded-control px-2.5 py-1.5 text-xs font-semibold text-text-2 transition-colors duration-200 ease-out hover:bg-surface hover:text-text"
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">Desde</span>
          <TextInput type="date" value={sinceInput} onChange={(e) => handleSinceChange(e.target.value)} max={untilInput} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">Hasta</span>
          <TextInput type="date" value={untilInput} onChange={(e) => handleUntilChange(e.target.value)} min={sinceInput} />
        </label>
      </div>

      {dateRangeError && <div className="rounded-control border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">{dateRangeError}</div>}

      {entitiesError ? (
        <div className="rounded-card border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">{entitiesError}</div>
      ) : entitiesLoading ? (
        <div className="rounded-card border border-border bg-surface px-6 py-10 text-center text-sm text-text-2">Cargando…</div>
      ) : entities.length === 0 ? (
        <div className="rounded-card border border-border bg-surface px-6 py-10 text-center text-sm text-text-2">
          Esta campaña no tiene {level === 'ad' ? 'anuncios' : 'conjuntos'}.
        </div>
      ) : snapshotLoading ? (
        <div className="rounded-card border border-border bg-surface px-6 py-10 text-center text-sm text-text-2">Cargando historial…</div>
      ) : snapshot && !snapshot.ok ? (
        <div className="rounded-card border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">{snapshot.error}</div>
      ) : dayPoints.length === 0 ? (
        <div className="rounded-card border border-border bg-surface px-6 py-10 text-center text-sm text-text-2">
          Sin datos en este rango — probá con un período más largo.
        </div>
      ) : (
        <>
          {/* Matriz de Comparación Día A vs Día B — la funcionalidad estrella
              (Snapshots Pro, 2026-08-04): permite detectar de un vistazo si
              un creativo se quemó (CPA sube, ROAS baja) o escaló bien entre
              dos puntos cualquiera del rango cargado, no solo días
              consecutivos. */}
          {dayA && dayB && (
            <div className="rounded-card border border-border bg-surface p-5">
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold tracking-tight text-text">Comparación Día A vs Día B</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={effectiveDayAId} onChange={(e) => setDayAId(e.target.value)} className="text-xs">
                    {dayPoints.map((p, i) => (
                      <option key={p.date} value={p.date}>
                        Día A: Día {i + 1} · {formatDateLabel(p.date)}
                      </option>
                    ))}
                  </Select>
                  <span className="text-xs text-text-3">vs</span>
                  <Select value={effectiveDayBId} onChange={(e) => setDayBId(e.target.value)} className="text-xs">
                    {dayPoints.map((p, i) => (
                      <option key={p.date} value={p.date}>
                        Día B: Día {i + 1} · {formatDateLabel(p.date)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-divider text-left text-[10px] font-bold uppercase tracking-wide text-text-3">
                      <th className="px-4 py-2">Métrica</th>
                      <th className="px-4 py-2 text-right">Día A</th>
                      <th className="px-4 py-2 text-right">Día B</th>
                      <th className="px-4 py-2 text-right">Δ Absoluto</th>
                      <th className="px-4 py-2 text-right">Δ %</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ComparisonRow label="Gasto" a={dayA.spend} b={dayB.spend} format={money} />
                    <ComparisonRow label="ROAS" a={dayA.roas} b={dayB.roas} format={(n) => `${n.toFixed(2)}x`} />
                    <ComparisonRow label="Ventas" a={dayA.revenue} b={dayB.revenue} format={money} />
                    <ComparisonRow label="Compras" a={dayA.purchases} b={dayB.purchases} format={(n) => String(Math.round(n))} />
                    <ComparisonRow label="CPA" a={dayA.cpa} b={dayB.cpa} format={money} invert />
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Métricas profundas — set completo por día, no solo el resumen de
              la matriz de arriba. */}
          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full text-xs">
              <thead className="bg-surface-2">
                <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-text-3">
                  <th className="px-4 py-2.5">Día</th>
                  <th className="px-4 py-2.5 text-right">Gasto</th>
                  <th className="px-4 py-2.5 text-right">ROAS</th>
                  <th className="px-4 py-2.5 text-right">Ventas</th>
                  <th className="px-4 py-2.5 text-right">Compras</th>
                  <th className="px-4 py-2.5 text-right">CPA</th>
                  <th className="px-4 py-2.5 text-right">CTR</th>
                  <th className="px-4 py-2.5 text-right">CPC</th>
                  <th className="px-4 py-2.5 text-right">Frecuencia</th>
                  <th className="px-4 py-2.5 text-right">Impresiones</th>
                </tr>
              </thead>
              <tbody>
                {dayPoints.map((point, i) => {
                  const prev = i > 0 ? dayPoints[i - 1] : null
                  const roasDelta = prev && prev.roas > 0 ? point.roas - prev.roas : null
                  const cpaDelta = prev && prev.cpa > 0 ? point.cpa - prev.cpa : null
                  const isA = point.date === effectiveDayAId
                  const isB = point.date === effectiveDayBId
                  return (
                    <tr
                      key={point.date || i}
                      className={`border-t border-divider ${isA || isB ? 'bg-accent/[0.04]' : ''}`}
                    >
                      <td className="px-4 py-2.5 font-medium text-text">
                        Día {i + 1} <span className="text-text-3">· {formatDateLabel(point.date)}</span>
                        {isA && <span className="ml-1.5 rounded-full border border-accent/40 bg-accent/[0.08] px-1.5 py-0.5 text-[9px] font-bold text-accent">A</span>}
                        {isB && <span className="ml-1.5 rounded-full border border-accent/40 bg-accent/[0.08] px-1.5 py-0.5 text-[9px] font-bold text-accent">B</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text">{money(point.spend)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text">
                        {point.roas.toFixed(2)}x
                        {roasDelta !== null && Math.abs(roasDelta) > 0.05 && (
                          <span className={`ml-1 text-[10px] font-bold ${roasDelta > 0 ? 'text-green' : 'text-red'}`}>
                            {roasDelta > 0 ? '↑' : '↓'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text">{money(point.revenue)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-2">{point.purchases}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text">
                        {point.cpa > 0 ? money(point.cpa) : '—'}
                        {cpaDelta !== null && Math.abs(cpaDelta) > 0.5 && (
                          <span className={`ml-1 text-[10px] font-bold ${cpaDelta < 0 ? 'text-green' : 'text-red'}`}>
                            {cpaDelta < 0 ? '↓' : '↑'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-2">{point.ctr.toFixed(2)}%</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-2">{money(point.cpc)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-2">{point.frequency.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-2">{point.impressions.toLocaleString('es-AR')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
