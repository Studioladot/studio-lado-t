import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Sincronización diaria de analítica orgánica de Instagram — corre por
// pg_cron una vez al día. Recorre TODAS las organizaciones con Instagram
// conectado (multi-tenant real, no una cuenta hardcodeada) y cachea
// snapshots en instagram_account_insights/instagram_media_insights — nunca
// se pega a la Insights API en vivo desde el navegador (rate limits +
// ventanas de retención cortas, ver plan).
//
// Fase 3.1 (2026-07-31): instagram_media_insights pasa a ser polimórfico
// (piece_id O post_id, nunca ambos — ver migración
// 20260731120000_content_posts_scheduling_and_polymorphic_insights.sql).
// Se sincronizan piezas de campaña Y publicaciones sueltas por igual, para
// que la Comparativa pueda cruzar ambas.
//
// Aislamiento de fallos: cada organización y cada ítem se procesan en su
// propio try/catch — una cuenta con el token vencido o una respuesta rara
// de la API nunca frena la sincronización de las demás organizaciones.
//
// Honestidad de datos: si una métrica puntual no viene en la respuesta (una
// cuenta chica sin umbral de audiencia, por ejemplo), esa columna queda
// null — nunca se completa con 0 ni se estima.

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'
const MEDIA_LOOKBACK_DAYS = 90 // acota el volumen de llamadas; ver plan.

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

type InsightValue = { name: string; values?: { value: number }[]; total_value?: { value: number } }

/** Extrae el valor de una métrica del formato de respuesta de la Insights API — nunca inventa 0 si no vino. */
function pickMetric(data: InsightValue[] | undefined, name: string): number | null {
  const entry = data?.find((d) => d.name === name)
  if (!entry) return null
  const value = entry.total_value?.value ?? entry.values?.[entry.values.length - 1]?.value
  return typeof value === 'number' ? value : null
}

const today = () => new Date().toISOString().split('T')[0]

Deno.serve(async (req) => {
  const role = decodeJwtRole(req.headers.get('Authorization'))
  if (role !== 'service_role') return json({ error: 'No autorizado.' }, 401)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: connections } = await supabase
    .from('instagram_connections')
    .select('organization_id, ig_user_id, page_access_token')

  let orgsProcessed = 0
  let mediaProcessed = 0
  const errors: string[] = []

  async function syncMediaForTable(sourceTable: SourceTable, organizationId: string, igUserId: string, pageAccessToken: string) {
    const since = new Date(Date.now() - MEDIA_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { data: items } = await supabase
      .from(sourceTable)
      .select('id, ig_media_id, media_type')
      .eq('organization_id', organizationId)
      .eq('publish_status', 'published')
      .not('ig_media_id', 'is', null)
      .gte('published_at', since)

    for (const item of items ?? []) {
      if (!item.ig_media_id) continue
      try {
        // Los Reels exponen "plays"; los posts de imagen no — pedir el
        // set equivocado devuelve error de la API en vez de nulls
        // prolijos, así que se elige el set según el tipo de media.
        const metricSet = item.media_type === 'video' ? 'plays,reach,likes,comments,shares,saved' : 'impressions,reach,likes,comments,saved'

        const mediaInsights = await graphGet(`${item.ig_media_id}/insights`, pageAccessToken, { metric: metricSet })
        if (mediaInsights.error) {
          errors.push(`${sourceTable} ${item.id}: ${mediaInsights.error.message}`)
          continue
        }

        const data: InsightValue[] = mediaInsights.data ?? []
        await supabase.from('instagram_media_insights').upsert(
          {
            organization_id: organizationId,
            piece_id: sourceTable === 'content_piezas' ? item.id : null,
            post_id: sourceTable === 'content_posts' ? item.id : null,
            // Vínculo explícito y auditable al medio real de Instagram del
            // que salieron estas métricas — el fetch de arriba ya usaba
            // este id (${item.ig_media_id}/insights, no un endpoint de
            // cuenta), esto lo deja trazable también en la fila guardada.
            ig_media_id: item.ig_media_id,
            captured_at: today(),
            plays: pickMetric(data, 'plays'),
            reach: pickMetric(data, 'reach'),
            likes: pickMetric(data, 'likes'),
            comments: pickMetric(data, 'comments'),
            shares: pickMetric(data, 'shares'),
            saves: pickMetric(data, 'saved'),
          },
          { onConflict: sourceTable === 'content_piezas' ? 'piece_id,captured_at' : 'post_id,captured_at' }
        )
        mediaProcessed++
      } catch (err) {
        errors.push(`${sourceTable} ${item.id}: ${err instanceof Error ? err.message : 'error desconocido'}`)
      }
    }
  }

  for (const conn of connections ?? []) {
    try {
      // ── Cuenta: seguidores, reach, impresiones ──────────────────────────
      const accountInsights = await graphGet(`${conn.ig_user_id}/insights`, conn.page_access_token, {
        metric: 'follower_count,reach,impressions',
        period: 'day',
      })

      if (!accountInsights.error) {
        const data: InsightValue[] = accountInsights.data ?? []
        await supabase.from('instagram_account_insights').upsert(
          {
            organization_id: conn.organization_id,
            captured_at: today(),
            follower_count: pickMetric(data, 'follower_count'),
            reach: pickMetric(data, 'reach'),
            impressions: pickMetric(data, 'impressions'),
          },
          { onConflict: 'organization_id,captured_at' }
        )
      } else {
        errors.push(`org ${conn.organization_id} (cuenta): ${accountInsights.error.message}`)
      }

      // ── Piezas de campaña Y publicaciones sueltas publicadas ────────────
      await syncMediaForTable('content_piezas', conn.organization_id, conn.ig_user_id, conn.page_access_token)
      await syncMediaForTable('content_posts', conn.organization_id, conn.ig_user_id, conn.page_access_token)

      orgsProcessed++
    } catch (err) {
      errors.push(`org ${conn.organization_id}: ${err instanceof Error ? err.message : 'error desconocido'}`)
    }
  }

  return json({ ok: true, orgsProcessed, mediaProcessed, errors })
})
