'use client'

import { useActionState, useEffect, useState } from 'react'
import { updatePieceAction, type UpdatePieceState } from './actions'
import { useFormStatusToast } from '@/components/features/use-form-status-toast'
import { MiniSpinner } from '@/components/features/action-pill'
import { useToast } from '@/components/features/toast'
import { CharCounterTextarea } from '@/components/features/char-counter-textarea'
import { FORMATOS, PLATAFORMAS, ProductionStatusSelect, TurnoSelect, NetworkCopyTabs, fieldClass, labelClass } from '../../content/piece-form-shared'
import { TITLE_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/lib/text-limits'
import type { Database } from '@/lib/types/database.types'

type Piece = Database['public']['Tables']['content_piezas']['Row']

const initialState: UpdatePieceState = { error: null, success: false }

function SaveButton() {
  // No dispara el toast de éxito acá — updatePieceAction no redirige y
  // `state.success` (más abajo) es una señal más confiable que la
  // transición de `pending`, que en algún caso podría coincidir con un
  // `error` sin success real.
  const pending = useFormStatusToast('Guardando…')

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
    >
      {pending && <MiniSpinner />}
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
  const [networkTab, setNetworkTab] = useState<'instagram' | 'tiktok'>('instagram')
  const toast = useToast()

  useEffect(() => {
    if (state.success) {
      toast.show('Guardado con éxito', 'success')
      onSaved()
    }
  }, [state.success, onSaved, toast])

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-3">
      <label className={labelClass}>
        Título
        <input
          name="titulo"
          type="text"
          required
          maxLength={TITLE_MAX_LENGTH}
          defaultValue={piece.titulo}
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Estado de Producción
          <ProductionStatusSelect defaultValue={piece.production_status ?? 'idea'} />
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
          <TurnoSelect defaultValue={piece.turno ?? 'Temprano'} />
        </label>
      </div>

      <label className={labelClass}>
        Protagonista (opcional)
        <input
          name="protagonista"
          type="text"
          maxLength={TITLE_MAX_LENGTH}
          defaultValue={piece.protagonista ?? ''}
          className={`normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <label className={labelClass}>
        Notas internas (no se publican)
        <CharCounterTextarea
          name="notas"
          rows={2}
          maxLength={TEXT_MAX_LENGTH}
          defaultValue={piece.notas}
          className={`resize-none normal-case tracking-normal ${fieldClass}`}
        />
      </label>

      <NetworkCopyTabs
        networkTab={networkTab}
        onNetworkTabChange={setNetworkTab}
        captionDefault={piece.caption}
        tiktokCaptionDefault={piece.tiktok_caption}
        instagramConnected={instagramConnected}
        tiktokConnected={tiktokConnected}
      />

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
      </div>
    </form>
  )
}
