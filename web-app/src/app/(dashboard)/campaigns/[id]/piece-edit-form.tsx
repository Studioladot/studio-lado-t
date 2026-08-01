'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { updatePieceAction, cancelScheduleAction, type UpdatePieceState } from './actions'
import type { Database } from '@/lib/types/database.types'

type Piece = Database['public']['Tables']['content_piezas']['Row']

const FORMATOS = ['Reel', 'TikTok', 'Carrusel', 'Historia', 'Post', 'Video largo', 'Otro']
const PLATAFORMAS = ['Instagram', 'TikTok', 'Ambas', 'YouTube']
const TURNOS = ['Temprano', 'Tarde', 'Noche']
// Ver post-form.tsx (Épica Omnicanal, 2026-08-04).
const PRODUCTION_STATUSES = [
  { value: 'idea', label: 'Idea' },
  { value: 'por_grabar', label: 'Por grabar' },
  { value: 'listo_para_programar', label: 'Listo para programar' },
  { value: 'programado', label: 'Programado' },
  { value: 'publicado', label: 'Publicado' },
]

const initialState: UpdatePieceState = { error: null, success: false }

// Mismo fix que add-piece-form.tsx: colores theme-aware, antes hardcodeados
// a hex claro (se rompía en dark mode).
const fieldClass =
  'rounded-control border border-border bg-surface-2/60 px-3 py-2.5 text-sm text-text outline-none transition-all duration-200 ease-out placeholder:text-text-3 focus:border-accent focus-visible:ring-2 focus-visible:ring-accent'

const labelClass = 'flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2'

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SaveButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Guardando…' : 'Guardar'}
    </button>
  )
}

export function PieceEditForm({
  piece,
  campaignId,
  instagramConnected,
  tiktokConnected,
  onSaved,
}: {
  piece: Piece
  campaignId: string
  instagramConnected: boolean
  tiktokConnected: boolean
  onSaved: () => void
}) {
  const boundAction = updatePieceAction.bind(null, piece.id, campaignId)
  const [state, formAction] = useActionState(boundAction, initialState)
  const [scheduleOn, setScheduleOn] = useState(piece.publish_status === 'scheduled')
  const [tiktokScheduleOn, setTiktokScheduleOn] = useState(piece.tiktok_publish_status === 'scheduled')
  const [networkTab, setNetworkTab] = useState<'instagram' | 'tiktok'>('instagram')

  useEffect(() => {
    if (state.success) onSaved()
  }, [state.success, onSaved])

  const isLocked = piece.publish_status === 'publishing' || piece.publish_status === 'published'

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-3">
      <label className={labelClass}>
        Título
        <input
          name="titulo"
          type="text"
          required
          defaultValue={piece.titulo}
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Estado de Producción
          <select name="production_status" defaultValue={piece.production_status ?? 'idea'} className={`normal-case tracking-normal ${fieldClass}`}>
            {PRODUCTION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Formato
          <select
            name="formato"
            defaultValue={piece.formato ?? 'Reel'}
            className={`normal-case tracking-normal ${fieldClass}`}
          >
            {FORMATOS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          Plataforma
          <select
            name="plataforma"
            defaultValue={piece.plataforma ?? 'Instagram'}
            className={`normal-case tracking-normal ${fieldClass}`}
          >
            {PLATAFORMAS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Fecha planificada
          <input
            name="fecha_planificada"
            type="date"
            defaultValue={piece.fecha_planificada ?? ''}
            className={`normal-case tracking-normal ${fieldClass}`}
          />
        </label>
        <label className={labelClass}>
          Turno
          <select
            name="turno"
            defaultValue={piece.turno ?? 'Temprano'}
            className={`normal-case tracking-normal ${fieldClass}`}
          >
            {TURNOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <label className={labelClass}>
        Protagonista (opcional)
        <input
          name="protagonista"
          type="text"
          defaultValue={piece.protagonista ?? ''}
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <label className={labelClass}>
        Notas internas (no se publican)
        <textarea
          name="notas"
          rows={2}
          defaultValue={piece.notas ?? ''}
          className={`resize-none normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <div className="flex gap-1 rounded-control border border-border bg-surface-2/40 p-1">
        <button
          type="button"
          onClick={() => setNetworkTab('instagram')}
          className={`flex-1 rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
            networkTab === 'instagram' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
          }`}
        >
          Configuración Instagram
        </button>
        <button
          type="button"
          onClick={() => setNetworkTab('tiktok')}
          className={`flex-1 rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
            networkTab === 'tiktok' ? 'bg-accent/[0.12] text-accent' : 'text-text-3 hover:text-text'
          }`}
        >
          Configuración TikTok
        </button>
      </div>

      <div className={networkTab === 'instagram' ? 'flex flex-col gap-3' : 'hidden'}>
        <label className={labelClass}>
          Copy (texto que se publica en Instagram)
          <textarea
            name="caption"
            rows={2}
            defaultValue={piece.caption ?? ''}
            className={`resize-none normal-case tracking-normal ${fieldClass}`}
          />
        </label>

        {isLocked ? (
          <div className="rounded-control border border-border bg-surface-2/40 p-3 text-[11px] text-text-3">
            {piece.publish_status === 'published'
              ? 'Ya se publicó en Instagram — no se puede reprogramar.'
              : 'Se está publicando ahora mismo — no se puede editar la programación en este momento.'}
          </div>
        ) : (
          <div className={`rounded-control border p-3 ${instagramConnected ? 'border-accent/30 bg-accent/[0.04]' : 'border-border bg-surface-2/40'}`}>
            <label className="flex items-center gap-2 text-xs font-semibold text-text">
              <input
                type="checkbox"
                name="schedule_enabled"
                disabled={!instagramConnected}
                checked={scheduleOn}
                onChange={(e) => setScheduleOn(e.target.checked)}
                className="disabled:cursor-not-allowed"
              />
              Programar auto-publicación en Instagram
            </label>
            {!instagramConnected ? (
              <p className="mt-1.5 text-[11px] text-text-3">Conectá Instagram desde Ajustes → Integraciones para poder programar.</p>
            ) : (
              scheduleOn && (
                <label className="mt-2.5 flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">
                  Fecha y hora de publicación
                  <input
                    name="scheduled_at"
                    type="datetime-local"
                    required={scheduleOn}
                    defaultValue={toDatetimeLocal(piece.scheduled_at)}
                    className={`normal-case tracking-normal ${fieldClass}`}
                  />
                </label>
              )
            )}
            {piece.publish_status === 'failed' && piece.publish_error && (
              <p className="mt-2 text-[11px] text-red">Último error: {piece.publish_error}</p>
            )}
          </div>
        )}
      </div>

      <div className={networkTab === 'tiktok' ? 'flex flex-col gap-3' : 'hidden'}>
        {!tiktokConnected ? (
          <div className="rounded-control border border-dashed border-border bg-surface-2/40 p-3 text-[11px] text-text-3">
            Conectá TikTok primero — necesita credenciales de la Content Posting API (Fase 2, todavía no disponible).
          </div>
        ) : (
          <>
            <label className={labelClass}>
              Copy (texto que se publica en TikTok)
              <textarea
                name="tiktok_caption"
                rows={2}
                defaultValue={piece.tiktok_caption ?? ''}
                className={`resize-none normal-case tracking-normal ${fieldClass}`}
              />
            </label>
            <div className="rounded-control border border-accent/30 bg-accent/[0.04] p-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-text">
                <input
                  type="checkbox"
                  name="tiktok_schedule_enabled"
                  checked={tiktokScheduleOn}
                  onChange={(e) => setTiktokScheduleOn(e.target.checked)}
                />
                Programar auto-publicación en TikTok
              </label>
              {tiktokScheduleOn && (
                <label className="mt-2.5 flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-text-2">
                  Fecha y hora de publicación
                  <input
                    name="tiktok_scheduled_at"
                    type="datetime-local"
                    required={tiktokScheduleOn}
                    defaultValue={toDatetimeLocal(piece.tiktok_scheduled_at)}
                    className={`normal-case tracking-normal ${fieldClass}`}
                  />
                </label>
              )}
              {piece.tiktok_publish_status === 'failed' && piece.tiktok_publish_error && (
                <p className="mt-2 text-[11px] text-red">Último error: {piece.tiktok_publish_error}</p>
              )}
            </div>
          </>
        )}
      </div>

      {state.error && <p className="text-xs text-red">{state.error}</p>}

      <div className="flex items-center gap-3">
        <SaveButton />
        <button
          type="button"
          onClick={onSaved}
          className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
        >
          Cancelar
        </button>
        {piece.publish_status === 'scheduled' && (
          <form action={cancelScheduleAction.bind(null, piece.id, campaignId)} className="ml-auto">
            <button type="submit" className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red">
              Cancelar programación
            </button>
          </form>
        )}
      </div>
    </form>
  )
}
