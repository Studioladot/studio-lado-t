import type { Database } from '@/lib/types/database.types'

type Post = Database['public']['Tables']['content_posts']['Row']
type Piece = Database['public']['Tables']['content_piezas']['Row']
type Campaign = Database['public']['Tables']['content_campaigns']['Row']

export type MediaItem = { url: string; type: 'image' | 'video' }

export type UnifiedItem = {
  id: string
  source: 'manual' | 'campana'
  campaignId: string | null
  campaignName: string
  campaignColor: string
  status: string
  date: string | null
  platform: string | null
  format: string | null
  caption: string
  titulo: string
  turno: string
  mediaUrl: string | null
  mediaType: string | null
  mediaList: MediaItem[]
}

function parseMediaList(value: unknown): MediaItem[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is MediaItem =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as MediaItem).url === 'string' &&
      ((item as MediaItem).type === 'image' || (item as MediaItem).type === 'video')
  )
}

export function unifyContentItems(posts: Post[], pieces: Piece[], campaigns: Campaign[]): UnifiedItem[] {
  const fromPosts: UnifiedItem[] = posts.map((p) => ({
    id: p.id,
    source: 'manual',
    campaignId: null,
    campaignName: '',
    campaignColor: '',
    status: p.status ?? 'pendiente',
    date: p.date,
    platform: p.platform,
    format: p.format,
    caption: p.caption ?? '',
    titulo: p.title ?? '',
    turno: p.turno ?? '',
    mediaUrl: p.media_url,
    mediaType: p.media_type,
    mediaList: parseMediaList(p.media_urls),
  }))

  const fromPieces: UnifiedItem[] = pieces.map((p) => {
    const camp = campaigns.find((c) => c.id === p.campaign_id)
    return {
      id: p.id,
      source: 'campana',
      campaignId: p.campaign_id,
      campaignName: camp?.nombre ?? 'Campaña orgánica',
      campaignColor: camp?.color ?? '#4C7EFF',
      status: p.status === 'publicado' || p.status === 'publicada' ? 'publicado' : 'pendiente',
      date: p.fecha_planificada,
      platform: p.plataforma,
      format: p.formato,
      caption: p.titulo,
      titulo: p.titulo,
      turno: p.turno ?? '',
      mediaUrl: null,
      mediaType: null,
      mediaList: parseMediaList(p.media_urls),
    }
  })

  return [...fromPosts, ...fromPieces]
}
