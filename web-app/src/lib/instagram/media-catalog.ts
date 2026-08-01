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
const MEDIA_FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'

export type InstagramMediaItem = {
  id: string
  caption?: string
  media_type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp: string
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
