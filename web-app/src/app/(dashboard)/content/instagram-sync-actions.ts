'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getInstagramMediaPage, getInstagramMediaInsights, type InstagramMediaItem } from '@/lib/instagram/media-catalog'

export type SyncInstagramResult = { ok: true; count: number; done: boolean } | { ok: false; error: string }

const MAX_ITEMS_PER_RUN = 40
const INSIGHT_CONCURRENCY = 5

/**
 * Sync "zero fricción" manual (Fase 1 del Panel de Inteligencia de
 * Contenido, 2026-08-01) — a diferencia de syncTiktokVideosAction
 * (video.list trae todo en una sola llamada), acá cada media necesita su
 * propia llamada a /insights, así que un solo click no puede traer el
 * historial completo sin arriesgar el tiempo máximo de un Server Action.
 * Procesa hasta MAX_ITEMS_PER_RUN por click, persiste el cursor de
 * paginación en instagram_connections.media_sync_cursor, y devuelve
 * done:false mientras quede más — la UI invita a volver a tocar
 * "Sincronizar ahora" hasta que done:true. Al llegar al final, un próximo
 * click reinicia desde el principio (upsert, así que refresca stats de
 * todo con el tiempo, en vez de trackear "solo lo nuevo").
 */
export async function syncInstagramMediaAction(): Promise<SyncInstagramResult> {
  try {
    const { activeOrganizationId } = await getDashboardContext()
    if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

    const supabase = await createClient()
    const { data: connection } = await supabase
      .from('instagram_connections')
      .select('ig_user_id, page_access_token, media_sync_cursor, media_sync_complete')
      .eq('organization_id', activeOrganizationId)
      .maybeSingle()

    if (!connection) return { ok: false, error: 'Instagram no está conectado.' }

    const cursor: string | undefined = connection.media_sync_complete ? undefined : (connection.media_sync_cursor ?? undefined)

    const batch: InstagramMediaItem[] = []
    let nextAfter: string | null = cursor ?? null
    let reachedEnd = false

    while (batch.length < MAX_ITEMS_PER_RUN) {
      const page = await getInstagramMediaPage(connection.ig_user_id, connection.page_access_token, nextAfter ?? undefined)
      if (!page.ok) return { ok: false, error: page.error }
      batch.push(...page.items)
      nextAfter = page.nextAfter
      if (!nextAfter) {
        reachedEnd = true
        break
      }
    }

    const items = batch.slice(0, MAX_ITEMS_PER_RUN)
    let synced = 0

    for (let i = 0; i < items.length; i += INSIGHT_CONCURRENCY) {
      const chunk = items.slice(i, i + INSIGHT_CONCURRENCY)
      const results = await Promise.all(chunk.map((item) => getInstagramMediaInsights(item.id, item.media_type, connection.page_access_token)))

      for (let j = 0; j < chunk.length; j++) {
        const item = chunk[j]
        const insightsResult = results[j]
        // Un ítem puntual con error (cuenta chica sin umbral, media
        // borrada, etc.) no frena el resto del lote — se guarda igual con
        // las métricas en null en vez de perder el ítem entero.
        const insights = insightsResult.ok
          ? insightsResult.data
          : { plays: null, reach: null, likes: null, comments: null, shares: null, saved: null, impressions: null }

        const { error: upsertError } = await supabase.from('instagram_media_catalog').upsert(
          {
            organization_id: activeOrganizationId,
            ig_media_id: item.id,
            caption: item.caption ?? null,
            media_type: item.media_type ?? null,
            media_url: item.media_url ?? null,
            thumbnail_url: item.thumbnail_url ?? null,
            permalink: item.permalink ?? null,
            posted_at: item.timestamp ?? null,
            like_count: insights.likes,
            comments_count: insights.comments,
            impressions: insights.impressions,
            reach: insights.reach,
            plays: insights.plays,
            saved: insights.saved,
            shares: insights.shares,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,ig_media_id' }
        )
        if (!upsertError) synced++
      }
    }

    const { error: cursorError } = await supabase
      .from('instagram_connections')
      .update({ media_sync_cursor: reachedEnd ? null : nextAfter, media_sync_complete: reachedEnd })
      .eq('organization_id', activeOrganizationId)
    if (cursorError) return { ok: false, error: `Se sincronizaron ${synced} videos, pero no pudimos guardar el progreso: ${cursorError.message}` }

    revalidatePath('/content')
    return { ok: true, count: synced, done: reachedEnd }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado al sincronizar Instagram.' }
  }
}
