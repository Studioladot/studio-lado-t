'use client'

import { useEffect, useRef, useState } from 'react'
import type { MetaAudience, MetaInterest } from '@/lib/meta/ad-launch'
import { fieldClass, labelClass } from './wizard-styles'

export type AudienceMode = 'broad' | 'existing' | 'custom'
export type Gender = 'all' | 'male' | 'female'

const COUNTRIES = [
  { code: 'AR', label: 'Argentina' },
  { code: 'UY', label: 'Uruguay' },
  { code: 'CL', label: 'Chile' },
  { code: 'MX', label: 'México' },
  { code: 'CO', label: 'Colombia' },
  { code: 'ES', label: 'España' },
  { code: 'US', label: 'Estados Unidos' },
]

const MODES: { id: AudienceMode; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    id: 'broad',
    label: 'Meta elige el público',
    sub: 'Advantage+ — recomendado',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    id: 'existing',
    label: 'Público existente',
    sub: 'Guardados, personalizados y similares',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'custom',
    label: 'Personalizado',
    sub: 'Intereses y demografía a medida',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h13M21 18h0" />
        <circle cx="16" cy="6" r="2" />
        <circle cx="9" cy="12" r="2" />
        <circle cx="18" cy="18" r="2" />
      </svg>
    ),
  },
]

function formatAudienceSize(n: number | null) {
  if (n === null) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1000)}K`
  return String(n)
}

export function AudienceSelector({ index, audiences }: { index: number; audiences: MetaAudience[] }) {
  const [mode, setMode] = useState<AudienceMode>('broad')
  const [existingAudienceId, setExistingAudienceId] = useState('')
  const [existingFilter, setExistingFilter] = useState('')

  const [ageMin, setAgeMin] = useState('18')
  const [ageMax, setAgeMax] = useState('65')
  const [gender, setGender] = useState<Gender>('all')
  const [country, setCountry] = useState('AR')

  const [interestQuery, setInterestQuery] = useState('')
  const [interestResults, setInterestResults] = useState<MetaInterest[]>([])
  const [interestsLoading, setInterestsLoading] = useState(false)
  const [selectedInterests, setSelectedInterests] = useState<MetaInterest[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce real hacia una API externa (no estado derivado que se pueda
  // ajustar durante el render) — caso legítimo de efecto, mismo criterio que
  // el resto de la sesión usa para lecturas/llamadas externas post-mount.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (interestQuery.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ligado al cambio de query, no hay forma de "ajustar durante el render" un debounce
      setInterestResults([])
      setInterestsLoading(false)
      return
    }
    setInterestsLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/meta/interests?q=${encodeURIComponent(interestQuery.trim())}`)
        const data = (await res.json()) as { ok: boolean; interests?: MetaInterest[] }
        setInterestResults(data.ok ? (data.interests ?? []) : [])
      } catch {
        setInterestResults([])
      } finally {
        setInterestsLoading(false)
      }
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [interestQuery])

  function addInterest(interest: MetaInterest) {
    setSelectedInterests((prev) => (prev.some((i) => i.id === interest.id) ? prev : [...prev, interest]))
    setInterestQuery('')
    setInterestResults([])
  }

  function removeInterest(id: string) {
    setSelectedInterests((prev) => prev.filter((i) => i.id !== id))
  }

  const saved = audiences.filter((a) => a.type === 'saved')
  const lookalike = audiences.filter((a) => a.type === 'lookalike')
  const filterFn = (a: MetaAudience) => a.name.toLowerCase().includes(existingFilter.trim().toLowerCase())
  const savedFiltered = saved.filter(filterFn)
  const lookalikeFiltered = lookalike.filter(filterFn)

  // Colapsado por default — el detalle completo (3 tarjetas + builder) ocupa
  // bastante alto, y la mayoría de las veces "Meta elige" alcanza. Se abre
  // con un clic cuando hace falta algo más específico.
  const [expanded, setExpanded] = useState(false)

  const summary =
    mode === 'broad'
      ? 'Meta elige el público'
      : mode === 'existing'
        ? (audiences.find((a) => a.id === existingAudienceId)?.name ?? 'Elegí un público existente')
        : [
            selectedInterests.length ? `${selectedInterests.length} interés${selectedInterests.length > 1 ? 'es' : ''}` : null,
            `${ageMin || 18}-${ageMax || 65} años`,
            gender !== 'all' ? (gender === 'male' ? 'Hombres' : 'Mujeres') : null,
          ]
            .filter(Boolean)
            .join(' · ')

  return (
    <div>
      <input type="hidden" name={`adset_audience_mode_${index}`} value={mode} />
      <input type="hidden" name={`adset_audience_${index}`} value={mode === 'existing' ? existingAudienceId : ''} />
      <input type="hidden" name={`adset_age_min_${index}`} value={mode === 'custom' ? ageMin : ''} />
      <input type="hidden" name={`adset_age_max_${index}`} value={mode === 'custom' ? ageMax : ''} />
      <input type="hidden" name={`adset_gender_${index}`} value={mode === 'custom' ? gender : 'all'} />
      <input type="hidden" name={`adset_country_${index}`} value={mode === 'custom' ? country : ''} />
      <input
        type="hidden"
        name={`adset_interests_${index}`}
        value={mode === 'custom' ? JSON.stringify(selectedInterests.map((i) => i.id)) : ''}
      />

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-between gap-2 rounded-control border border-border bg-surface-2/50 px-3 py-2.5 text-left transition-colors duration-200 ease-out hover:bg-surface-2"
        >
          <span className="flex min-w-0 items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-3">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="truncate text-[13px] text-text">
              <span className="font-semibold">Público:</span> {summary}
            </span>
          </span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-3">
            <path d="M2.5 3.5l2.5 3 2.5-3" />
          </svg>
        </button>
      ) : (
        <>
          <div className="mb-1.5 flex items-center justify-between">
            <p className={labelClass}>Público</p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-[11px] font-semibold text-text-3 transition-colors duration-200 ease-out hover:text-text"
            >
              Cerrar
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`flex items-start gap-2.5 rounded-control border px-3 py-2.5 text-left transition-colors duration-200 ease-out ${
              mode === m.id ? 'border-accent bg-accent/[0.06]' : 'border-border hover:bg-surface-2'
            }`}
          >
            <span className={`mt-0.5 shrink-0 ${mode === m.id ? 'text-accent' : 'text-text-3'}`}>{m.icon}</span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-text">{m.label}</span>
              <span className="block text-[11px] text-text-3">{m.sub}</span>
            </span>
          </button>
        ))}
      </div>

      {mode === 'existing' && (
        <div className="mt-3 rounded-control border border-border p-3">
          {audiences.length === 0 ? (
            <p className="text-xs text-text-3">Todavía no tenés públicos guardados en tu cuenta de Meta.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {audiences.length > 6 && (
                <input
                  type="text"
                  value={existingFilter}
                  onChange={(e) => setExistingFilter(e.target.value)}
                  placeholder="Buscar por nombre…"
                  className={fieldClass}
                />
              )}

              {savedFiltered.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-text-3">💾 Guardados</p>
                  <div className="flex flex-col gap-1.5">
                    {savedFiltered.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        aria-pressed={existingAudienceId === a.id}
                        onClick={() => setExistingAudienceId(a.id)}
                        className={`truncate rounded-md border px-3 py-2 text-left text-[13px] transition-colors duration-200 ease-out ${
                          existingAudienceId === a.id
                            ? 'border-accent bg-accent/[0.06] font-semibold text-text'
                            : 'border-border text-text-2 hover:bg-surface-2'
                        }`}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {lookalikeFiltered.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-text-3">👥 Similares</p>
                  <div className="flex flex-col gap-1.5">
                    {lookalikeFiltered.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        aria-pressed={existingAudienceId === a.id}
                        onClick={() => setExistingAudienceId(a.id)}
                        className={`truncate rounded-md border px-3 py-2 text-left text-[13px] transition-colors duration-200 ease-out ${
                          existingAudienceId === a.id
                            ? 'border-accent bg-accent/[0.06] font-semibold text-text'
                            : 'border-border text-text-2 hover:bg-surface-2'
                        }`}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {savedFiltered.length === 0 && lookalikeFiltered.length === 0 && (
                <p className="text-xs text-text-3">Nada coincide con &ldquo;{existingFilter}&rdquo;.</p>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'custom' && (
        <div className="mt-3 flex flex-col gap-4 rounded-control border border-border p-3">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-text-3">Segmentación detallada</p>
            <div className="relative">
              <input
                type="text"
                value={interestQuery}
                onChange={(e) => setInterestQuery(e.target.value)}
                placeholder="Buscar intereses — ej: Moda, Ecommerce, Fitness"
                className={fieldClass + ' w-full'}
              />
              {(interestsLoading || interestResults.length > 0) && interestQuery.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-[220px] overflow-y-auto rounded-control border border-border-2 bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.16)]">
                  {interestsLoading ? (
                    <p className="px-3 py-2.5 text-xs text-text-3">Buscando…</p>
                  ) : (
                    interestResults.map((interest) => (
                      <button
                        key={interest.id}
                        type="button"
                        onClick={() => addInterest(interest)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] text-text transition-colors duration-150 ease-out hover:bg-surface-2"
                      >
                        <span className="truncate">{interest.name}</span>
                        {interest.audienceSizeUpper !== null && (
                          <span className="shrink-0 text-[11px] text-text-3">
                            ~{formatAudienceSize(interest.audienceSizeUpper)}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedInterests.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedInterests.map((interest) => (
                  <span
                    key={interest.id}
                    className="flex items-center gap-1.5 rounded-full bg-accent/[0.1] py-1 pl-2.5 pr-1.5 text-[12px] font-medium text-accent"
                  >
                    {interest.name}
                    <button
                      type="button"
                      onClick={() => removeInterest(interest.id)}
                      aria-label={`Quitar ${interest.name}`}
                      className="flex h-4 w-4 items-center justify-center rounded-full text-accent/70 hover:bg-accent/20 hover:text-accent"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-xs text-text-3">Dejalo vacío para no restringir por intereses.</p>
          </div>

          <div className="border-t border-border pt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-3">Demografía</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`adset_age_min_input_${index}`} className={labelClass}>
                  Edad mín.
                </label>
                <input
                  id={`adset_age_min_input_${index}`}
                  type="number"
                  min={18}
                  max={65}
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`adset_age_max_input_${index}`} className={labelClass}>
                  Edad máx.
                </label>
                <input
                  id={`adset_age_max_input_${index}`}
                  type="number"
                  min={18}
                  max={65}
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <label htmlFor={`adset_country_input_${index}`} className={labelClass}>
                  Ubicación
                </label>
                <select
                  id={`adset_country_input_${index}`}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={fieldClass}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3">
              <p className={`mb-1.5 ${labelClass}`}>Sexo</p>
              <div className="inline-flex rounded-control border border-border p-0.5">
                {([
                  ['all', 'Todos'],
                  ['male', 'Hombres'],
                  ['female', 'Mujeres'],
                ] as [Gender, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={gender === value}
                    onClick={() => setGender(value)}
                    className={`rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
                      gender === value ? 'bg-primary text-white' : 'text-text-2 hover:text-text'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}
