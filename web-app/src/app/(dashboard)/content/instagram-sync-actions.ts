'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getInstagramMediaPage, getInstagramMediaInsights, type InstagramMediaItem } from '@/lib/instagram/media-catalog'

export type SyncInstagramResult =
  | { ok: true; count: number; done: boolean; withoutInsights: number; withoutLikeData: number }
  | { ok: false; error: string }

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
    // Bug real reportado (2026-08-01): pedir media_sync_cursor/
    // media_sync_complete por nombre explícito hacía fallar la consulta
    // ENTERA si esas columnas todavía no existían (migración 20260805130000
    // sin correr) — Postgres/PostgREST rechaza un select de una columna que
    // no existe, a diferencia de select('*') que simplemente no la incluye.
    // Esa consulta fallida volvía connection=null, y el mensaje genérico de
    // "Instagram no está conectado" aparecía aunque sí estuviera conectado
    // (era la consulta la que fallaba, no la conexión). select('*') hace
    // que esto ande igual aunque la migración nueva no haya corrido —
    // media_sync_cursor/media_sync_complete simplemente van a ser
    // undefined hasta que corra.
    const { data: connection, error: connectionError } = await supabase
      .from('instagram_connections')
      .select('*')
      .eq('organization_id', activeOrganizationId)
      .maybeSingle()

    if (connectionError) return { ok: false, error: `No pudimos leer la conexión de Instagram: ${connectionError.message}` }
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
    let withoutInsights = 0
    // Antes el mensaje de la UI afirmaba "like_count y comments_count sí
    // llegaron" sin verificarlo — era una suposición, no un hecho medido.
    // Esto cuenta de verdad cuántos ítems terminan sin ninguno de los dos
    // (ni del objeto de media ni de /insights como respaldo), para que el
    // mensaje solo afirme lo que realmente pasó.
    let withoutLikeData = 0
    let lastUpsertError: string | null = null

    for (let i = 0; i < items.length; i += INSIGHT_CONCURRENCY) {
      const chunk = items.slice(i, i + INSIGHT_CONCURRENCY)
      const results = await Promise.all(chunk.map((item) => getInstagramMediaInsights(item.id, item.media_type, connection.page_access_token)))

      for (let j = 0; j < chunk.length; j++) {
        const item = chunk[j]
        const insightsResult = results[j]
        // Un ítem puntual con error de /insights (cuenta chica sin umbral,
        // o el motivo real reportado: la Insights API de Instagram no
        // siempre tiene datos para contenido viejo — mismo motivo por el
        // que instagram-metrics-sync acota a MEDIA_LOOKBACK_DAYS=90) no
        // frena el resto del lote. Se cuenta (withoutInsights) para poder
        // avisarlo, en vez de tragarlo en silencio como antes.
        if (!insightsResult.ok) withoutInsights++
        const insights = insightsResult.ok
          ? insightsResult.data
          : { plays: null, reach: null, likes: null, comments: null, shares: null, saved: null, impressions: null }

        // like_count/comments_count del objeto de media son la fuente
        // primaria (bug real corregido acá, 2026-08-01) — a diferencia de
        // /insights, no dependen de ninguna ventana de retención, son un
        // contador vigente como cualquier "me gusta" de la app.
        // insights.likes/comments quedan de respaldo por si el objeto de
        // media no los trajera por algún motivo.
        const finalLikes = item.like_count ?? insights.likes
        const finalComments = item.comments_count ?? insights.comments
        if (finalLikes == null && finalComments == null) withoutLikeData++

        const { error: upsertError } = await supabase.from('instagram_media_catalog').upsert(
          {
            organization_id: activeOrganizationId,
            ig_media_id: item.id,
            caption: item.caption ?? null,
            media_type: item.media_type ?? null,
            media_product_type: item.media_product_type ?? null,
            media_url: item.media_url ?? null,
            thumbnail_url: item.thumbnail_url ?? null,
            permalink: item.permalink ?? null,
            posted_at: item.timestamp ?? null,
            like_count: finalLikes,
            comments_count: finalComments,
            impressions: insights.impressions,
            reach: insights.reach,
            plays: insights.plays,
            saved: insights.saved,
            shares: insights.shares,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,ig_media_id' }
        )
        if (upsertError) lastUpsertError = upsertError.message
        else synced++
      }
    }

    // Si todo falló (ej. instagram_media_catalog todavía no existe porque
    // la migración no corrió), antes esto volvía {ok:true, count:0} — un
    // "éxito" falso que escondía el problema real. Con items de sobra y
    // cero guardados, es un error real, no "no había nada nuevo".
    if (items.length > 0 && synced === 0 && lastUpsertError) {
      return { ok: false, error: `No pudimos guardar el catálogo: ${lastUpsertError}` }
    }

    const { error: cursorError } = await supabase
      .from('instagram_connections')
      .update({ media_sync_cursor: reachedEnd ? null : nextAfter, media_sync_complete: reachedEnd })
      .eq('organization_id', activeOrganizationId)
    if (cursorError) return { ok: false, error: `Se sincronizaron ${synced} videos, pero no pudimos guardar el progreso: ${cursorError.message}` }

    revalidatePath('/content')
    return { ok: true, count: synced, done: reachedEnd, withoutInsights, withoutLikeData }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado al sincronizar Instagram.' }
  }
}
