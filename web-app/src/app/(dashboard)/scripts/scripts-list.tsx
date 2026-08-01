'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConvertToAdModal } from './[id]/convert-to-ad-modal'
import { STATUS_LABEL, STATUS_COLOR } from './constants'
import type { Database } from '@/lib/types/database.types'

type Script = Database['public']['Tables']['scripts']['Row']

// Acción rápida "Convertir a Anuncio" también en la lista (2026-07-27) — ya
// vivía en la página de detalle (script-edit-form.tsx); esto evita tener que
// entrar a cada guion terminado solo para subir el archivo. La fila deja de
// ser un único <Link> envolvente porque un <button> no puede anidarse dentro
// de un <a> — el título/ángulo siguen siendo el link a /scripts/[id], el
// resto de la fila queda afuera del link.

export function ScriptsList({ scripts }: { scripts: Script[] }) {
  const [convertingScript, setConvertingScript] = useState<Script | null>(null)
  const router = useRouter()

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {scripts.map((script) => (
          <div
            key={script.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface px-5 py-4 transition-all duration-200 ease-out hover:border-border-2"
          >
            <Link href={`/scripts/${script.id}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">{script.title || 'Sin título'}</p>
              <p className="mt-0.5 text-xs text-text-2">{script.angle || '—'}</p>
            </Link>
            <div className="flex shrink-0 items-center gap-2.5">
              <span
                className={`rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  STATUS_COLOR[script.status ?? ''] ?? 'text-text-2'
                }`}
              >
                {STATUS_LABEL[script.status ?? ''] ?? script.status}
              </span>
              <button
                type="button"
                onClick={() => setConvertingScript(script)}
                className="rounded-control border border-accent/30 bg-accent/[0.06] px-2.5 py-1 text-[11px] font-semibold text-accent transition-all duration-200 ease-out hover:bg-accent/[0.12]"
              >
                Convertir a Anuncio
              </button>
            </div>
          </div>
        ))}
      </div>

      {convertingScript && (
        <ConvertToAdModal
          open
          onClose={() => setConvertingScript(null)}
          scriptId={convertingScript.id}
          defaultName={convertingScript.title ?? 'Sin título'}
          defaultHeadline={convertingScript.hook ?? ''}
          defaultPrimaryText={convertingScript.copy_feed || convertingScript.body || ''}
          onDone={() => {
            setConvertingScript(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
