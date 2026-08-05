'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { addAdToAdSetAction, getAddAdModalDataAction, type AddAdToAdSetState, type AddAdModalData } from '../actions'
import { AdEditor } from '../new/ad-editor'
import { fieldClass, labelClass } from '../new/wizard-styles'
import { useToast } from '@/components/features/toast'

const initialState: AddAdToAdSetState = { error: null, success: false }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Guardando…' : 'Guardar anuncio'}
    </button>
  )
}

// Panel en blanco que se abre apenas termina de duplicarse un conjunto
// (2026-08-06, "Duplicación Inteligente de Conjuntos") — el conjunto ya
// nace con toda la configuración pesada resuelta (audiencia, presupuesto,
// ubicaciones); acá solo falta lo liviano: el creativo nuevo y su copy.
// Reusa AdEditor tal cual (adSetIndex=0, adIndex=0 — son solo prefijos de
// nombre de campo, no crean un conjunto nuevo) para no duplicar la UI de
// subida de imagen/video/reuso de publicación/Biblioteca que ya existe en
// el wizard completo.
export function AddAdModal({
  adSetId,
  adSetName,
  campaignId,
  onClose,
}: {
  adSetId: string
  adSetName: string
  campaignId: string
  onClose: () => void
}) {
  const router = useRouter()
  const toast = useToast()
  const boundAction = addAdToAdSetAction.bind(null, adSetId, campaignId)
  const [data, setData] = useState<AddAdModalData | null>(null)
  const [pageId, setPageId] = useState('')

  useEffect(() => {
    let cancelled = false
    getAddAdModalDataAction().then((result) => {
      if (cancelled) return
      setData(result)
      if (result.ok && result.pages.length > 0) setPageId(result.pages[0].id)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[86vh] w-[640px] max-w-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-accent">Conjunto duplicado — {adSetName}</p>
            <h2 className="mt-0.5 text-base font-bold text-text">Subí el creativo nuevo</h2>
            <p className="mt-0.5 text-xs text-text-2">
              El público, el presupuesto y las ubicaciones ya se copiaron del conjunto original — solo falta el anuncio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-3 transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!data ? (
          <div className="flex flex-1 items-center justify-center px-6 py-16">
            <p className="text-sm text-text-2">Cargando datos de la cuenta…</p>
          </div>
        ) : !data.ok ? (
          <div className="px-6 py-8">
            <p className="rounded-control border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">{data.error}</p>
          </div>
        ) : (
          <AddAdFormBody
            action={boundAction}
            pageId={pageId}
            setPageId={setPageId}
            pages={data.pages}
            existingPosts={data.existingPosts}
            scripts={data.scripts}
            libraryCreatives={data.libraryCreatives}
            onDone={() => {
              toast.show('Anuncio agregado con éxito', 'success')
              router.refresh()
              onClose()
            }}
          />
        )}
      </div>
    </div>
  )
}

function AddAdFormBody({
  action,
  pageId,
  setPageId,
  pages,
  existingPosts,
  scripts,
  libraryCreatives,
  onDone,
}: {
  action: (state: AddAdToAdSetState, formData: FormData) => Promise<AddAdToAdSetState>
  pageId: string
  setPageId: (id: string) => void
  pages: Extract<AddAdModalData, { ok: true }>['pages']
  existingPosts: Extract<AddAdModalData, { ok: true }>['existingPosts']
  scripts: Extract<AddAdModalData, { ok: true }>['scripts']
  libraryCreatives: Extract<AddAdModalData, { ok: true }>['libraryCreatives']
  onDone: () => void
}) {
  const [state, formAction] = useActionState(action, initialState)

  useEffect(() => {
    if (state.success) onDone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {state.error && (
          <div className="mb-4 rounded-control border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">{state.error}</div>
        )}

        {pages.length > 1 ? (
          <div className="mb-4 flex flex-col gap-1.5">
            <label htmlFor="add_ad_page_id" className={labelClass}>
              Página de Facebook
            </label>
            <select
              id="add_ad_page_id"
              name="page_id"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              className={fieldClass}
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="page_id" value={pageId} />
        )}

        <AdEditor
          adSetIndex={0}
          adIndex={0}
          adNumber={1}
          scripts={scripts}
          existingPosts={existingPosts}
          libraryCreatives={libraryCreatives}
          removable={false}
          onRemove={() => {}}
        />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
        <SubmitButton />
      </div>
    </form>
  )
}
