'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { syncInstagramAccountInsightsAction, syncInstagramMediaAction } from './instagram-sync-actions'

// "Real-time feel" (2026-08-06, Parte 1 de la refactorización del Nivel 1) —
// apenas se detecta que Instagram está conectado pero
// instagram_account_insights todavía no tiene ningún día cargado (cuenta
// recién conectada, antes de la primera corrida del cron diario), este
// componente dispara el fetch histórico "instantáneo" solo, sin que el
// usuario tenga que tocar nada — más el botón manual de al lado del
// @usuario para forzarlo de nuevo cuando quiera. autoTriggered evita que el
// efecto se repita (incluido el doble-mount de StrictMode en dev) una vez
// que ya se disparó.
//
// Único botón de sync de toda la sección (2026-08-06) — antes convivía con
// un segundo botón "Sincronizar ahora" propio de InstagramMediaCatalogSection,
// visualmente duplicado. Un solo click ahora dispara las dos
// sincronizaciones en paralelo: los KPIs/gráficos de cuenta
// (syncInstagramAccountInsightsAction) y un lote del catálogo de
// publicaciones (syncInstagramMediaAction, que sigue necesitando varios
// clicks para traer el historial completo — cuentas grandes no entran en
// un solo Server Action, ver su propio comentario).
export function InstagramSyncControl({ igUsername, hasAccountData }: { igUsername: string | null; hasAccountData: boolean }) {
  const [isSyncing, startSync] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // Feedback de éxito (2026-08-06, auditoría) — al consolidar los dos
  // botones de sync en uno solo, este componente se quedó sin ningún
  // mensaje visible cuando la sincronización SÍ funciona (antes el botón
  // propio del Catálogo mostraba "Actualizamos N publicaciones..."). Un
  // click que "no hace nada visible" lee como roto aunque haya andado.
  const [message, setMessage] = useState<string | null>(null)
  const autoTriggered = useRef(false)

  function runSync() {
    setError(null)
    setMessage(null)
    startSync(async () => {
      const [accountResult, catalogResult] = await Promise.all([syncInstagramAccountInsightsAction(), syncInstagramMediaAction()])

      // Bug real reportado (2026-08-06): este log SOLO se disparaba adentro
      // de los "if (!result.ok)" — cuando las dos acciones terminan en
      // ok:true (que es lo que pasaba: syncInstagramMediaAction reporta
      // éxito aunque items puntuales se hayan quedado sin datos de
      // Insights, ver withoutInsights) la consola quedaba 100% muda, sin
      // ninguna pista. Todos los demás console.error (getInstagramMediaPage,
      // getInstagramMediaInsights, el propio syncInstagramMediaAction) VIVEN
      // EN EL SERVIDOR — corren dentro de un Server Action, así que ese
      // texto va a los logs de Vercel, nunca al navegador, sin importar
      // qué pase acá. Por eso ahora esto loguea SIEMPRE, haya o no error,
      // con el resultado completo de las dos acciones — firstInsightsError/
      // debugCode viajan explícitamente en el objeto para no depender de
      // ir a buscar logs del servidor.
      console.log('[InstagramSyncControl] resultado del sync:', { account: accountResult, catalog: catalogResult })

      const failures: string[] = []
      if (!accountResult.ok) failures.push(accountResult.error)
      if (!catalogResult.ok) failures.push(catalogResult.error)
      if (failures.length > 0) {
        setError(failures[0])
        return
      }

      const parts: string[] = []
      if (accountResult.ok && accountResult.daysSynced > 0) parts.push(`${accountResult.daysSynced} días de estadísticas`)
      if (catalogResult.ok && catalogResult.count > 0) parts.push(`${catalogResult.count} publicaciones`)
      setMessage(parts.length > 0 ? `Sincronizado: ${parts.join(' y ')}.` : 'Ya estabas al día — no había nada nuevo para traer.')
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
        title="Sincronizar Instagram ahora"
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
      {message && <span className="text-[10px] text-green">{message}</span>}
    </div>
  )
}
