'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getInstagramMediaPage, getInstagramMediaInsights, type InstagramMediaItem } from '@/lib/instagram/media-catalog'
import { fetchInstagramAccountInsightsHistory } from '@/lib/instagram/account-insights-sync'

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

    if (connectionError) {
      console.error('[syncInstagramMediaAction] lectura de la conexión falló:', connectionError.message)
      return { ok: false, error: 'No pudimos revisar tu conexión de Instagram. Probá de nuevo en unos minutos.' }
    }
    if (!connection) return { ok: false, error: 'Instagram no está conectado.' }

    const cursor: string | undefined = connection.media_sync_complete ? undefined : (connection.media_sync_cursor ?? undefined)

    const batch: InstagramMediaItem[] = []
    let nextAfter: string | null = cursor ?? null
    let reachedEnd = false

    while (batch.length < MAX_ITEMS_PER_RUN) {
      const page = await getInstagramMediaPage(connection.ig_user_id, connection.page_access_token, nextAfter ?? undefined)
      if (!page.ok) {
        console.error('[syncInstagramMediaAction] Graph API falló:', page.error)
        return { ok: false, error: 'No pudimos traer tu historial de Instagram. Probá de nuevo en unos minutos.' }
      }
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
      console.error('[syncInstagramMediaAction] upsert falló:', lastUpsertError)
      return { ok: false, error: 'No pudimos guardar tu historial. Probá de nuevo en unos minutos.' }
    }

    const { error: cursorError } = await supabase
      .from('instagram_connections')
      .update({ media_sync_cursor: reachedEnd ? null : nextAfter, media_sync_complete: reachedEnd })
      .eq('organization_id', activeOrganizationId)
    if (cursorError) {
      console.error('[syncInstagramMediaAction] no se pudo guardar el progreso:', cursorError.message)
      return { ok: false, error: `Actualizamos ${synced} publicaciones, pero no pudimos guardar el progreso. Probá de nuevo en unos minutos.` }
    }

    revalidatePath('/content')
    return { ok: true, count: synced, done: reachedEnd, withoutInsights, withoutLikeData }
  } catch (err) {
    console.error('[syncInstagramMediaAction] excepción inesperada:', err)
    return { ok: false, error: 'Error inesperado al sincronizar Instagram. Probá de nuevo en unos minutos.' }
  }
}

// debugCode nunca se muestra en la UI (el mensaje sigue siendo 100%
// comercial) — es solo lo que InstagramSyncControl manda a console.error
// del navegador, para poder distinguir en qué paso falló sin tener que ir
// a buscar los logs de Vercel en cada intento.
export type SyncAccountInsightsResult = { ok: true; daysSynced: number } | { ok: false; error: string; debugCode: string }

/**
 * Sync "instantáneo" de Insights a nivel cuenta (2026-08-06, "real-time
 * feel") — a diferencia del cron diario de instagram-metrics-sync (1 punto
 * por día, hasta 24hs para el primer dato), esto trae hasta 30 días de
 * historial de una sola pasada para que los KPIs/gráficos de Nivel 1 no
 * queden vacíos apenas se conecta la cuenta. Se dispara solo (ver
 * instagram-sync-control.tsx) cuando se detecta conexión sin datos, y
 * también manual desde el botón "Sincronizar" al lado del @usuario.
 */
export async function syncInstagramAccountInsightsAction(): Promise<SyncAccountInsightsResult> {
  try {
    const { activeOrganizationId } = await getDashboardContext()
    if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.', debugCode: 'no-org' }

    const supabase = await createClient()
    const { data: connection, error: connectionError } = await supabase
      .from('instagram_connections')
      .select('ig_user_id, page_access_token')
      .eq('organization_id', activeOrganizationId)
      .maybeSingle()

    if (connectionError) {
      console.error('[syncInstagramAccountInsightsAction] lectura de la conexión falló:', connectionError.message)
      return {
        ok: false,
        error: 'No pudimos revisar tu conexión de Instagram. Probá de nuevo en unos minutos.',
        debugCode: `connection-read-failed: ${connectionError.message}`,
      }
    }
    if (!connection) return { ok: false, error: 'Instagram no está conectado.', debugCode: 'not-connected' }

    const history = await fetchInstagramAccountInsightsHistory(connection.ig_user_id, connection.page_access_token)
    if (!history.ok) {
      console.error('[syncInstagramAccountInsightsAction] Graph API falló:', history.error)
      return {
        ok: false,
        error: 'No pudimos traer tus estadísticas de Instagram. Probá de nuevo en unos minutos.',
        // code/subcode de Meta (ej. 190 = token vencido) — enteros chicos,
        // sin tokens ni datos de cuenta, seguros para la consola del
        // navegador. El mensaje completo de Meta solo queda en los logs de
        // Vercel (console.error de fetchInstagramAccountInsightsHistory).
        debugCode: `graph-api-error: code=${history.code ?? '?'} subcode=${history.subcode ?? '?'} — mensaje completo en los logs de Vercel`,
      }
    }
    if (history.days.length === 0) {
      return { ok: true, daysSynced: 0 }
    }

    // instagram_account_insights no tiene policy de insert/update para
    // authenticated (solo la Edge Function con service_role escribe ahí,
    // ver migración 20260730150000) — activeOrganizationId ya está
    // verificado arriba, así que este upsert queda tan scopeado como lo
    // estaría con RLS.
    let serviceRole
    try {
      serviceRole = createServiceRoleClient()
    } catch (err) {
      // Si SUPABASE_SERVICE_ROLE_KEY no está seteada en el entorno del
      // servidor (Vercel), el constructor de supabase-js tira acá — antes
      // esto caía en el catch genérico de más abajo y se perdía en un
      // "Error inesperado" sin pista. debugCode lo deja explícito.
      console.error('[syncInstagramAccountInsightsAction] no se pudo crear el cliente de service role:', err)
      return {
        ok: false,
        error: 'No pudimos guardar tus estadísticas. Probá de nuevo en unos minutos.',
        debugCode: `service-role-client-failed: ${err instanceof Error ? err.message : String(err)}`,
      }
    }

    const { error: upsertError } = await serviceRole.from('instagram_account_insights').upsert(
      history.days.map((d) => ({
        organization_id: activeOrganizationId,
        captured_at: d.capturedAt,
        follower_count: d.followerCount,
        reach: d.reach,
        impressions: d.impressions,
        profile_views: d.profileViews,
        total_interactions: d.totalInteractions,
      })),
      { onConflict: 'organization_id,captured_at' }
    )

    if (upsertError) {
      console.error('[syncInstagramAccountInsightsAction] upsert falló:', upsertError.message)
      return {
        ok: false,
        error: 'No pudimos guardar tus estadísticas. Probá de nuevo en unos minutos.',
        debugCode: `upsert-failed: ${upsertError.message}`,
      }
    }

    revalidatePath('/content')
    return { ok: true, daysSynced: history.days.length }
  } catch (err) {
    console.error('[syncInstagramAccountInsightsAction] excepción inesperada:', err)
    return {
      ok: false,
      error: 'Error inesperado al sincronizar Instagram. Probá de nuevo en unos minutos.',
      debugCode: `exception: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
