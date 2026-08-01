import { META_GRAPH_URL } from '@/lib/meta/oauth'

// Catálogo "zero fricción" del feed histórico + Reels reales de la cuenta
// (2026-08-01) — a diferencia de tiktok_videos (donde video.list ya trae
// las estadísticas en la misma llamada), acá la Graph API separa el
// listado de medios (/media) de sus insights (/{media-id}/insights): una
// llamada extra POR CADA video/post. Esto es una diferencia real de
// arquitectura entre las dos plataformas, no un descuido — ver
// syncInstagramMediaAction (content/instagram-sync-actions.ts) sobre cómo
// se acota para no exceder el tiempo máximo de un Server Action.
//
// Los sets de métricas (`plays,reach,likes,comments,shares,saved` para
// video; `impressions,reach,likes,comments,saved` para el resto) son los
// mismos que ya usa, probados en producción,
// supabase/functions/instagram-metrics-sync/index.ts — no se inventaron
// nombres nuevos acá.
//
// Bug real reportado (2026-08-01): las métricas venían todas en 0/—.
// like_count/comments_count SÍ vienen directo en el objeto de /media (no
// hace falta /insights para esos dos) — se agregan acá como fuente
// primaria, con el valor de /insights como respaldo. Esto importa en
// serio para el "feed histórico completo": la Insights API de Instagram
// tiene una ventana de retención real y no siempre devuelve datos para
// contenido viejo (mismo motivo por el que instagram-metrics-sync acota a
// MEDIA_LOOKBACK_DAYS=90 en vez de traer todo) — like_count/comments_count
// del objeto de media no tienen esa restricción, son un contador vigente
// como cualquier "me gusta" de la app, así que funcionan para posts de
// cualquier antigüedad aunque /insights falle o venga vacío para ellos.
//
// media_product_type (FEED/REELS/STORY) se agrega para poder mostrar el
// badge real de formato — media_type solo distingue IMAGE/VIDEO/
// CAROUSEL_ALBUM, no alcanza para saber si un VIDEO es un Reel.
const MEDIA_FIELDS = 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count'

export type InstagramMediaItem = {
  id: string
  caption?: string
  media_type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_product_type?: 'FEED' | 'REELS' | 'STORY' | 'CAROUSEL_CONTAINER' | 'AD'
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp: string
  like_count?: number
  comments_count?: number
}

type MediaPageResult = { ok: true; items: InstagramMediaItem[]; nextAfter: string | null } | { ok: false; error: string }

export async function getInstagramMediaPage(igUserId: string, accessToken: string, after?: string): Promise<MediaPageResult> {
  const params = new URLSearchParams({ fields: MEDIA_FIELDS, limit: '25', access_token: accessToken })
  if (after) params.set('after', after)

  try {
    const res = await fetch(`${META_GRAPH_URL}/${igUserId}/media?${params}`)
    const data = await res.json()
    if (data.error) return { ok: false, error: data.error.message ?? 'Error desconocido de Meta.' }

    let nextAfter: string | null = null
    if (data.paging?.next) {
      nextAfter = new URL(data.paging.next).searchParams.get('after')
    }

    return { ok: true, items: data.data ?? [], nextAfter }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red.' }
  }
}

type InsightValue = { name: string; values?: { value: number }[]; total_value?: { value: number } }

function pickMetric(data: InsightValue[], name: string): number | null {
  const entry = data.find((d) => d.name === name)
  if (!entry) return null
  const value = entry.total_value?.value ?? entry.values?.[entry.values.length - 1]?.value
  return typeof value === 'number' ? value : null
}

export type InstagramMediaInsightsData = {
  plays: number | null
  reach: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saved: number | null
  impressions: number | null
}

type MediaInsightsResult = { ok: true; data: InstagramMediaInsightsData } | { ok: false; error: string }

export async function getInstagramMediaInsights(
  mediaId: string,
  mediaType: string | undefined,
  accessToken: string
): Promise<MediaInsightsResult> {
  const metricSet = mediaType === 'VIDEO' ? 'plays,reach,likes,comments,shares,saved' : 'impressions,reach,likes,comments,saved'

  try {
    const res = await fetch(`${META_GRAPH_URL}/${mediaId}/insights?metric=${metricSet}&access_token=${accessToken}`)
    const json = await res.json()
    if (json.error) return { ok: false, error: json.error.message ?? 'Error desconocido de Meta.' }

    const data: InsightValue[] = json.data ?? []
    return {
      ok: true,
      data: {
        plays: pickMetric(data, 'plays'),
        reach: pickMetric(data, 'reach'),
        likes: pickMetric(data, 'likes'),
        comments: pickMetric(data, 'comments'),
        shares: pickMetric(data, 'shares'),
        saved: pickMetric(data, 'saved'),
        impressions: pickMetric(data, 'impressions'),
      },
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red.' }
  }
}
