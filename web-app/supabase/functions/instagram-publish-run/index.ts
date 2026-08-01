import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Auto-publicación en Instagram — corre por pg_cron cada 5-10 min (no cada
// hora como autopilot-run: una hora de margen es inaceptable para "programado
// a las 18:30"). Multi-tenant real: un solo invocation recorre TODAS las
// piezas/publicaciones 'scheduled' vencidas de TODAS las organizaciones que
// tengan Instagram conectado, no una cuenta hardcodeada.
//
// Fase 3.1 (2026-07-31): procesa content_piezas Y content_posts —
// publicaciones sueltas ganaron el mismo scheduling que las piezas de
// campaña. Ambas tablas tienen exactamente las mismas 7 columnas de
// scheduling (mismos nombres), así que toda la lógica por-ítem está
// factorizada acá una sola vez, parametrizada por tabla — no hay dos copias
// del mismo código que puedan divergir.
//
// Aislamiento de fallos (2026-07-30, corrigiendo un defecto real que
// encontramos en autopilot-run/index.ts: su loop de organizaciones no tiene
// try/catch, una excepción no controlada en una org corta la corrida
// completa). Acá CADA ítem se procesa en su propio try/catch — un fallo
// nunca frena el resto del batch.
//
// Diseño en dos fases porque la Content Publishing API es asíncrona
// (crear contenedor y publicarlo pueden estar separados por minutos si es
// video) y las Edge Functions tienen límite de tiempo de ejecución — nunca
// se bloquea esperando, cada fase avanza lo que puede y el resto queda
// para la corrida siguiente:
//   Fase A: ítems 'scheduled' vencidos sin contenedor → crear contenedor.
//   Fase B: ítems 'publishing' con contenedor sin media_id → poll de
//           estado; si terminó, publicar.
//
// Autorización: solo service_role (pg_cron/Vault) — no hay UI todavía que
// dispare esto manualmente.

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'
const BATCH_LIMIT = 50
const MAX_RETRIES = 3
const DAILY_PUBLISH_LIMIT = 25 // límite real de la API de Instagram por cuenta

type SourceTable = 'content_piezas' | 'content_posts'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(input.length + ((4 - (input.length % 4)) % 4), '=')
  return atob(padded)
}

function decodeJwtRole(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const parts = authHeader.slice(7).split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    return null
  }
}

async function graphGet(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`${GRAPH_BASE}/${path}`)
  url.searchParams.set('access_token', token)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url)
  return res.json()
}

async function graphPost(path: string, token: string, body: Record<string, string>) {
  const res = await fetch(`${GRAPH_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...body, access_token: token }),
  })
  return res.json()
}

type Item = {
  id: string
  organization_id: string
  caption: string | null
  media_url: string | null
  media_type: string | null
  ig_container_id: string | null
  retry_count: number
}

type IgConnection = { ig_user_id: string; page_access_token: string }

Deno.serve(async (req) => {
  const role = decodeJwtRole(req.headers.get('Authorization'))
  if (role !== 'service_role') return json({ error: 'No autorizado.' }, 401)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const connectionCache = new Map<string, IgConnection | null>()
  async function getConnection(organizationId: string): Promise<IgConnection | null> {
    if (connectionCache.has(organizationId)) return connectionCache.get(organizationId)!
    const { data } = await supabase
      .from('instagram_connections')
      .select('ig_user_id, page_access_token')
      .eq('organization_id', organizationId)
      .maybeSingle()
    connectionCache.set(organizationId, data ?? null)
    return data ?? null
  }

  async function countPublishedLast24h(sourceTable: SourceTable, organizationId: string): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from(sourceTable)
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('published_at', since)
    return count ?? 0
  }

  // Reintento con backoff: no marca failed al primer error transitorio —
  // vuelve a 'scheduled' hasta MAX_RETRIES, recién ahí se rinde.
  // ig_container_id se limpia al reintentar (no al rendirse) — si no, el
  // ítem queda huérfano: Fase A lo salta porque ya tiene container_id,
  // Fase B lo salta porque ya no está en 'publishing'.
  async function failOrRetry(sourceTable: SourceTable, item: Item, message: string) {
    const nextRetryCount = item.retry_count + 1
    const giveUp = nextRetryCount >= MAX_RETRIES
    await supabase
      .from(sourceTable)
      .update({
        publish_status: giveUp ? 'failed' : 'scheduled',
        publish_error: message,
        retry_count: nextRetryCount,
        ig_container_id: giveUp ? item.ig_container_id : null,
      })
      .eq('id', item.id)
  }

  let containersCreated = 0
  let published = 0
  const errors: string[] = []

  async function processPendingPhase(sourceTable: SourceTable) {
    const { data: pendingItems } = await supabase
      .from(sourceTable)
      .select('id, organization_id, caption, media_url, media_type, ig_container_id, retry_count')
      .eq('publish_status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .is('ig_container_id', null)
      .order('scheduled_at', { ascending: true })
      .limit(BATCH_LIMIT)

    for (const item of (pendingItems ?? []) as Item[]) {
      try {
        const conn = await getConnection(item.organization_id)
        if (!conn) {
          await failOrRetry(sourceTable, item, 'Instagram no está conectado para esta organización.')
          continue
        }

        if (!item.media_url) {
          await supabase
            .from(sourceTable)
            .update({ publish_status: 'failed', publish_error: 'No tiene ningún archivo adjunto.' })
            .eq('id', item.id)
          continue
        }

        const publishedToday = await countPublishedLast24h(sourceTable, item.organization_id)
        if (publishedToday >= DAILY_PUBLISH_LIMIT) {
          // No es un fallo — Instagram limita 25 publicaciones/24hs por
          // cuenta. Se deja 'scheduled' sin tocar retry_count, la próxima
          // corrida lo retoma cuando libere el límite.
          continue
        }

        // Reclamo atómico: si dos corridas se solapan, solo una gana el
        // update (where publish_status='scheduled' todavía).
        const { data: claimed } = await supabase
          .from(sourceTable)
          .update({ publish_status: 'publishing' })
          .eq('id', item.id)
          .eq('publish_status', 'scheduled')
          .select('id')
        if (!claimed || claimed.length === 0) continue

        const isVideo = item.media_type === 'video'
        const containerParams: Record<string, string> = isVideo
          ? { media_type: 'REELS', video_url: item.media_url, caption: item.caption ?? '' }
          : { image_url: item.media_url, caption: item.caption ?? '' }

        const containerRes = await graphPost(`${conn.ig_user_id}/media`, conn.page_access_token, containerParams)
        if (containerRes.error || !containerRes.id) {
          await failOrRetry(sourceTable, item, containerRes.error?.message ?? 'No pudimos crear el contenedor de publicación.')
          continue
        }

        await supabase.from(sourceTable).update({ ig_container_id: containerRes.id }).eq('id', item.id)
        containersCreated++
      } catch (err) {
        errors.push(`${sourceTable} ${item.id}: ${err instanceof Error ? err.message : 'error desconocido'}`)
      }
    }
  }

  async function processPublishingPhase(sourceTable: SourceTable) {
    const { data: processingItems } = await supabase
      .from(sourceTable)
      .select('id, organization_id, caption, media_url, media_type, ig_container_id, retry_count')
      .eq('publish_status', 'publishing')
      .not('ig_container_id', 'is', null)
      .is('ig_media_id', null)
      .limit(BATCH_LIMIT)

    for (const item of (processingItems ?? []) as Item[]) {
      try {
        const conn = await getConnection(item.organization_id)
        if (!conn || !item.ig_container_id) continue

        const statusRes = await graphGet(item.ig_container_id, conn.page_access_token, { fields: 'status_code' })
        if (statusRes.error) {
          await failOrRetry(sourceTable, item, statusRes.error.message)
          continue
        }

        // EXPIRED es un estado terminal (Meta descarta el contenedor si no
        // se publica dentro de 24hs) — tratarlo como "todavía procesando"
        // lo dejaría reintentando para siempre sin marcarlo nunca failed.
        if (statusRes.status_code === 'ERROR' || statusRes.status_code === 'EXPIRED') {
          await failOrRetry(
            sourceTable,
            item,
            statusRes.status_code === 'EXPIRED'
              ? 'El contenedor expiró antes de poder publicarse (24hs sin confirmar).'
              : 'Instagram no pudo procesar el archivo (video corrupto o formato no soportado).'
          )
          continue
        }

        if (statusRes.status_code !== 'FINISHED') continue // sigue procesando (IN_PROGRESS), se retoma la próxima corrida

        const publishRes = await graphPost(`${conn.ig_user_id}/media_publish`, conn.page_access_token, {
          creation_id: item.ig_container_id,
        })
        if (publishRes.error || !publishRes.id) {
          await failOrRetry(sourceTable, item, publishRes.error?.message ?? 'No pudimos publicar el contenedor ya procesado.')
          continue
        }

        const permalinkRes = await graphGet(publishRes.id, conn.page_access_token, { fields: 'permalink' })

        await supabase
          .from(sourceTable)
          .update({
            publish_status: 'published',
            ig_media_id: publishRes.id,
            ig_permalink: typeof permalinkRes.permalink === 'string' ? permalinkRes.permalink : null,
            published_at: new Date().toISOString(),
            publish_error: null,
            // Épica Omnicanal (2026-08-04): production_status es el estado
            // de producción que ve la UI nueva (Idea→Grabación→Edición→
            // Publicación); status es el flag legacy del que dependen las
            // rachas de control-panel.tsx (`status === 'publicado'`). Los
            // dos se sincronizan acá para que una publicación automática
            // exitosa cuente en ambos lugares, no solo en publish_status.
            production_status: 'publicado',
            status: 'publicado',
          })
          .eq('id', item.id)
        published++
      } catch (err) {
        errors.push(`${sourceTable} ${item.id}: ${err instanceof Error ? err.message : 'error desconocido'}`)
      }
    }
  }

  for (const sourceTable of ['content_piezas', 'content_posts'] as SourceTable[]) {
    await processPendingPhase(sourceTable)
    await processPublishingPhase(sourceTable)
  }

  return json({ ok: true, containersCreated, published, errors })
})
