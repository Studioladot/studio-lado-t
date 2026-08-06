'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { InstagramIcon } from '@/components/features/nav-icons'
import { primaryMetric, formatLabel, type InstagramCatalogRow } from '@/lib/instagram/media-catalog-winners'
import { createLibraryCreativeRecordAction } from '../meta-ads/library/actions'

// Mismo fix que tiktok-video-detail-modal.tsx (bug real reportado,
// 2026-08-01): columnas nuevas sin migrar vienen `undefined`, no `null` —
// fmt/Bar/SalesAttributionRow tienen que aceptar los dos.
function fmt(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : n.toLocaleString('es-AR')
}

function Bar({ label, value, max }: { label: string; value: number | null | undefined; max: number }) {
  const v = value ?? 0
  const pct = max > 0 ? Math.min(100, (v / max) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-text-2">{label}</span>
        <span className="font-semibold tabular-nums text-text">{fmt(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-all duration-300 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// "Arquitectura del Santo Grial" (2026-08-01) — Ventas atribuidas/ROAS
// orgánico/Clics al link quedan como placeholder explícito, nunca en 0 ni
// inventados: hoy no hay ningún cruce con Tiendanube/WhatsApp que pueda
// llenarlos. attributedSales/roasOrganic/linkClicks vienen de las
// columnas ya reservadas en la migración — si en algún momento la próxima
// fase las completa, esta misma UI ya las va a mostrar sin tocar nada acá.
function SalesAttributionRow({
  attributedSales,
  roasOrganic,
  linkClicks,
}: {
  attributedSales: number | null | undefined
  roasOrganic: number | null | undefined
  linkClicks: number | null | undefined
}) {
  const hasData = attributedSales != null || roasOrganic != null || linkClicks != null
  return (
    <div className="rounded-control border border-dashed border-accent/30 bg-accent/[0.03] p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-3">Impacto en ventas</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-sm font-bold tabular-nums text-text">{fmt(attributedSales)}</p>
          <p className="mt-0.5 text-[9px] text-text-3">Ventas atrib.</p>
        </div>
        <div>
          <p className="text-sm font-bold tabular-nums text-text">{roasOrganic != null ? `${roasOrganic.toFixed(1)}x` : '—'}</p>
          <p className="mt-0.5 text-[9px] text-text-3">ROAS orgánico</p>
        </div>
        <div>
          <p className="text-sm font-bold tabular-nums text-text">{fmt(linkClicks)}</p>
          <p className="mt-0.5 text-[9px] text-text-3">Clics al link</p>
        </div>
      </div>
      {!hasData && (
        <p className="mt-2 text-[10px] leading-relaxed text-text-3">
          Todavía no hay conexión con Tiendanube/WhatsApp para atribuir ventas a este contenido.
        </p>
      )}
    </div>
  )
}

function truncate(text: string, maxChars: number): string {
  const trimmed = text.trim()
  return trimmed.length > maxChars ? `${trimmed.slice(0, maxChars - 1)}…` : trimmed
}

/**
 * "Convertir en Campaña de Meta Ads" (killer feature de cierre de Fase 1,
 * 2026-08-06) — cierra el loop entre lo orgánico y lo pago: en vez de
 * re-armar un anuncio desde cero, agrega este ganador directo a la
 * Biblioteca de Ads (reusa createLibraryCreativeRecordAction, YA
 * construido y funcionando — cero código nuevo de integración con la
 * Graph API). Desde ahí, "Lanzar Testeo" en Meta Ads ya sabe re-subir
 * cualquier fileUrl de la Biblioteca al crear el anuncio real (ver
 * createSingleAd, meta-ads/campaigns/actions.ts) — no hace falta que el
 * archivo esté en el bucket propio de Gotix, la URL de Instagram alcanza.
 *
 * Deliberadamente NO se intenta reusar el post original vía
 * object_story_id/source_instagram_media_id de la Graph API — sin poder
 * verificar ese comportamiento contra la documentación real de Meta en
 * esta sesión, ir por la Biblioteca (un camino ya construido y probado)
 * es la opción segura, no una apuesta a una API que no se confirmó.
 */
function ConvertToCampaignAction({ item }: { item: InstagramCatalogRow }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  // Un carrusel no tiene un único archivo representativo — media_url de la
  // API de Instagram para CAROUSEL_ALBUM no es un asset reusable como
  // creativo. Mejor no ofrecer la acción que ofrecerla y que falle.
  if (item.media_type === 'CAROUSEL_ALBUM' || !item.media_url) return null

  async function handleConvert() {
    setState('loading')
    setError(null)
    const result = await createLibraryCreativeRecordAction({
      fileUrl: item.media_url as string,
      assetType: item.media_type === 'VIDEO' ? 'video' : 'image',
      name: item.caption ? truncate(item.caption, 60) : `Ganador orgánico — ${formatLabel(item)}`,
      primaryText: item.caption,
      headline: null,
      cta: 'SHOP_NOW',
    })
    if (!result.ok) {
      setState('error')
      setError(result.error)
      return
    }
    setState('done')
  }

  if (state === 'done') {
    return (
      <div className="rounded-control border border-green/30 bg-green/6 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-green">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Agregado a tu Biblioteca de Ads
        </p>
        <Link href="/meta-ads/campaigns" className="mt-1 inline-block text-[11px] font-semibold text-accent hover:text-accent/80">
          Ir a Meta Ads → Lanzar Testeo →
        </Link>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleConvert}
        disabled={state === 'loading'}
        className="w-full rounded-control border border-accent/30 bg-accent/6 px-3 py-2.5 text-xs font-semibold text-accent transition-all duration-200 ease-out hover:bg-accent/12 disabled:cursor-wait disabled:opacity-70"
      >
        {state === 'loading' ? 'Agregando…' : 'Convertir en Campaña de Meta Ads'}
      </button>
      {error && <p className="mt-1.5 text-[11px] text-red">{error}</p>}
    </div>
  )
}

export function InstagramMediaDetailModal({
  item,
  maxPrimary,
  maxLikes,
  maxComments,
  publishedWithGotix,
  onClose,
}: {
  item: InstagramCatalogRow
  maxPrimary: number
  maxLikes: number
  maxComments: number
  publishedWithGotix?: boolean
  onClose: () => void
}) {
  // Denominador = primaryMetric (plays ?? impressions ?? reach, mismo
  // criterio que el resto del catálogo) — para un Reel eso es plays, más
  // representativo que impressions/reach como base de "cuánta gente vio
  // esto e interactuó". Numerador con los 4 tipos de interacción reales
  // (antes faltaba `shares`, subestimando la tasa real).
  const engagementBase = primaryMetric(item)
  const engagementRate =
    engagementBase > 0
      ? (((item.like_count ?? 0) + (item.comments_count ?? 0) + (item.shares ?? 0) + (item.saved ?? 0)) / engagementBase) * 100
      : 0

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-[440px] overflow-y-auto rounded-card border border-border bg-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[3/4] max-h-[280px] w-full bg-black">
          {item.thumbnail_url || item.media_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen remota de Instagram, no un asset local.
            <img src={item.thumbnail_url ?? item.media_url ?? undefined} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-text-3">
              <InstagramIcon size={28} />
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
            {formatLabel(item)}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors duration-200 ease-out hover:bg-black/70"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {publishedWithGotix && (
            <span className="w-fit rounded-full bg-accent/[0.12] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
              Publicado con Gotix
            </span>
          )}
          <p className="text-sm leading-relaxed text-text">{item.caption || 'Sin descripción'}</p>

          {/* Campos reales sin conflacionar (2026-08-06, pedido explícito) —
              antes esto mostraba UN solo bar "Reproducciones o Impresiones"
              (primaryMetric ya elige el mejor dato disponible para
              ordenar/badges, pero acá el usuario quiere ver cada campo que
              la API realmente devolvió, por separado). Reproducciones/
              Alcance/Impresiones comparten `maxPrimary` como escala (misma
              familia de magnitud); Compartidos/Guardados comparten
              `maxComments` (magnitud típica más chica, misma familia que
              Comentarios). Cualquiera que la Insights API no haya
              devuelto para este ítem queda en "—", nunca 0. */}
          <div className="flex flex-col gap-2.5">
            <Bar label="Reproducciones" value={item.plays} max={maxPrimary} />
            <Bar label="Alcance" value={item.reach} max={maxPrimary} />
            <Bar label="Impresiones" value={item.impressions} max={maxPrimary} />
            <Bar label="Likes" value={item.like_count} max={maxLikes} />
            <Bar label="Comentarios" value={item.comments_count} max={maxComments} />
            <Bar label="Compartidos" value={item.shares} max={maxComments} />
            <Bar label="Guardados" value={item.saved} max={maxComments} />
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-control border border-border bg-border">
            <div className="bg-surface px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Tasa de interacción</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-text">{engagementRate.toFixed(1)}%</p>
            </div>
            <div className="bg-surface px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">Publicado</p>
              <p className="mt-0.5 text-sm text-text">{item.posted_at ? new Date(item.posted_at).toLocaleDateString('es-AR') : '—'}</p>
            </div>
          </div>

          <SalesAttributionRow attributedSales={item.attributed_sales} roasOrganic={item.roas_organic} linkClicks={item.link_clicks} />

          <ConvertToCampaignAction item={item} />

          {item.permalink && (
            <a href={item.permalink} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent transition-colors duration-200 ease-out hover:text-accent/80">
              Ver en Instagram →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
