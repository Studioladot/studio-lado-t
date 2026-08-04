'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { syncInstagramAccountInsightsAction } from './instagram-sync-actions'

// "Real-time feel" (2026-08-06, Parte 1 de la refactorización del Nivel 1) —
// apenas se detecta que Instagram está conectado pero
// instagram_account_insights todavía no tiene ningún día cargado (cuenta
// recién conectada, antes de la primera corrida del cron diario), este
// componente dispara el fetch histórico "instantáneo" solo, sin que el
// usuario tenga que tocar nada — más el botón manual de al lado del
// @usuario para forzarlo de nuevo cuando quiera. autoTriggered evita que el
// efecto se repita (incluido el doble-mount de StrictMode en dev) una vez
// que ya se disparó.
export function InstagramSyncControl({ igUsername, hasAccountData }: { igUsername: string | null; hasAccountData: boolean }) {
  const [isSyncing, startSync] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const autoTriggered = useRef(false)

  function runSync() {
    setError(null)
    startSync(async () => {
      const result = await syncInstagramAccountInsightsAction()
      if (!result.ok) {
        // Mensaje comercial en pantalla (result.error) + el motivo real en
        // la consola del navegador (result.debugCode) — nunca al revés.
        // debugCode nunca trae tokens ni datos de cuenta (ver
        // instagram-sync-actions.ts), así que es seguro tenerlo acá.
        console.error('[InstagramSyncControl] syncInstagramAccountInsightsAction falló:', result.debugCode)
        setError(result.error)
      }
    })
  }

  useEffect(() => {
    if (hasAccountData || autoTriggered.current) return
    autoTriggered.current = true
    runSync()
  }, [hasAccountData])

  return (
    <div className="flex items-center gap-2.5">
      {igUsername && <p className="text-xs font-medium text-text-2">@{igUsername}</p>}
      <button
        type="button"
        onClick={runSync}
        disabled={isSyncing}
        title="Sincronizar estadísticas ahora"
        className="flex items-center gap-1 rounded-control px-1.5 py-0.5 text-text-3 transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isSyncing ? 'animate-spin' : ''}
        >
          <path d="M15.5 9a6.5 6.5 0 1 1-1.9-4.6" />
          <path d="M15.5 2.5v4h-4" />
        </svg>
        <span className="text-[10px] font-semibold">{isSyncing ? 'Sincronizando…' : 'Sincronizar'}</span>
      </button>
      {error && <span className="text-[10px] text-red">{error}</span>}
    </div>
  )
}
