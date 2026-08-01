'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { disconnectTiendaNubeFromSalesAction } from './actions'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'

// Tarjeta de estado de conexión — puerto de #tn-connected del legado
// (app.html:2166-2179). El legado tenía un botón "Sincronizar ventas ahora"
// porque cacheaba las ventas client-side (tn_cache); acá cada carga de
// página ya trae datos frescos del servidor, así que "sincronizar" es
// simplemente forzar un refresh del Server Component — router.refresh(), sin
// caché propia que invalidar. "Última sincronización" es honesto: es
// literalmente cuándo se renderizó esta página por última vez.

function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'hace instantes'
  if (mins < 60) return `hace ${mins} min`
  return `hace ${Math.round(mins / 60)} h`
}

export function TiendaConnectionCard({ storeName, lastSyncedAt }: { storeName: string | null; lastSyncedAt: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [, forceTick] = useState(0)

  // Recalcula el texto relativo cada 30s sin depender de un nuevo render del
  // servidor — mismo criterio que setTNLastSync del legado.
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="metric-card flex flex-wrap items-center justify-between gap-4 rounded-card px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green/[0.12] text-green">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-text">{storeName ?? 'Tienda Nube'}</p>
          <p className="text-xs text-text-2">Conectado correctamente</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => router.refresh())}
          className="flex items-center gap-1.5 rounded-control bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isPending ? 'animate-spin' : undefined}
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
          {isPending ? 'Sincronizando…' : 'Sincronizar ventas ahora'}
        </button>
        <p className="text-[11px] text-text-3">Última sincronización: {relativeTime(lastSyncedAt)}</p>
        <form action={disconnectTiendaNubeFromSalesAction}>
          <ConfirmSubmitButton
            confirmMessage="¿Desconectar Tienda Nube? Vas a tener que volver a autorizar para reconectar."
            className="rounded-control border border-red/30 bg-red/[0.06] px-3.5 py-2 text-xs font-bold text-red transition-all duration-200 ease-out hover:bg-red/[0.12]"
          >
            Desconectar
          </ConfirmSubmitButton>
        </form>
      </div>
    </div>
  )
}
