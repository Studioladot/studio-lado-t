'use client'

import { useState } from 'react'
import { createTiendaNubeLinkAction } from '../../actions'

// Copia el link de conexión de Tienda Nube de la cuenta activa. Se pega en
// otro perfil de Chrome / ventana de incógnito donde esté abierta la tienda
// de esta cuenta, o se le manda al dueño de la tienda. No hace falta cerrar
// la sesión de Tienda Nube de este navegador.
export function TiendaNubeLinkButton({ accountName }: { accountName: string | null }) {
  const [state, setState] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle')
  const [url, setUrl] = useState<string | null>(null)

  async function handleClick() {
    setState('loading')
    const result = await createTiendaNubeLinkAction()
    if (!result.url) {
      setState('error')
      return
    }
    setUrl(result.url)
    try {
      await navigator.clipboard.writeText(result.url)
      setState('copied')
    } catch {
      setState('idle')
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'loading'}
        className="flex items-center justify-center gap-2 rounded-control border border-border-2 px-3 py-2 text-xs font-semibold text-text transition-colors duration-200 ease-out hover:bg-surface-2 disabled:opacity-60"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
          <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
        </svg>
        {state === 'loading' ? 'Generando…' : state === 'copied' ? 'Link copiado' : 'Copiar link de conexión'}
      </button>
      {state === 'error' && <p className="text-[11px] text-red">No se pudo generar el link. Probá de nuevo.</p>}
      {url && state !== 'copied' && state !== 'error' && (
        <input readOnly value={url} onFocus={(e) => e.target.select()} className="w-full rounded-control border border-border bg-surface-2/60 px-2 py-1 text-[10px] text-text-2" />
      )}
      <p className="text-[11px] leading-relaxed text-text-3">
        {state === 'copied'
          ? `Pegalo en el perfil de Chrome (o ventana de incógnito) donde tengas abierta la tienda${accountName ? ` de ${accountName}` : ''}, o mandáselo al dueño. Vale 48 horas.`
          : 'Para conectar otra tienda sin cerrar sesión: abrilo en otro perfil de Chrome o en incógnito con esa tienda, o mandáselo al dueño.'}
      </p>
    </div>
  )
}
