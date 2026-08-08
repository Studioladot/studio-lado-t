import { DEFAULT_CAMPAIGN_COLOR } from '../campaigns/campaign-colors'
import type { Database } from '@/lib/types/database.types'

type Post = Database['public']['Tables']['content_posts']['Row']
type Piece = Database['public']['Tables']['content_piezas']['Row']
type Campaign = Database['public']['Tables']['content_campaigns']['Row']

export type MediaItem = { url: string; type: 'image' | 'video' }

export type UnifiedItem = {
  id: string
  /** Qué tabla real hay que tocar para editar/programar/borrar este ítem — el Calendario y la tabla de Publicaciones lo necesitan para saber qué action llamar. */
  sourceTable: 'content_piezas' | 'content_posts'
  source: 'manual' | 'campana'
  campaignId: string | null
  campaignName: string
  campaignColor: string
  status: string
  date: string | null
  platform: string | null
  format: string | null
  /** Copy real, sin fallback a titulo — usado por ItemViewModal ("Ver"). Un titulo mostrado como si fuera el copy publicado sería engañoso. */
  caption: string | null
  /** Notas internas del equipo (nunca se publican) — campo separado de caption, no debe confundirse con el copy. */
  internalNotes: string | null
  titulo: string
  turno: string
  mediaList: MediaItem[]
  /** "Pilares de Contenido" (2026-08-07) — solo content_posts lo tiene hoy; las piezas de campaña quedan en null (nunca se inventa un valor). */
  pillar: string | null
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
    sourceTable: 'content_posts',
    source: 'manual',
    campaignId: null,
    campaignName: '',
    campaignColor: '',
    status: p.status ?? 'pendiente',
    date: p.date,
    platform: p.platform,
    format: p.format,
    caption: p.caption,
    internalNotes: p.notes,
    titulo: p.title ?? '',
    turno: p.turno ?? '',
    // Referencias (moodboard/tomas crudas), no el "Archivo Final" — ese
    // concepto se eliminó del flujo (decisión de producto, 2026-08-05):
    // Gotix ya no sube ni gestiona la pieza publicable, solo planificación.
    mediaList: parseMediaList(p.reference_urls),
    pillar: p.pillar,
  }))

  const fromPieces: UnifiedItem[] = pieces.map((p) => {
    const camp = campaigns.find((c) => c.id === p.campaign_id)
    return {
      id: p.id,
      sourceTable: 'content_piezas',
      source: 'campana',
      campaignId: p.campaign_id,
      campaignName: camp?.nombre ?? 'Campaña orgánica',
      campaignColor: camp?.color ?? DEFAULT_CAMPAIGN_COLOR,
      status: p.status === 'publicado' || p.status === 'publicada' ? 'publicado' : 'pendiente',
      date: p.fecha_planificada,
      platform: p.plataforma,
      format: p.formato,
      // Antes usaba p.titulo acá — resabio de cuando content_piezas todavía
      // no tenía columna `caption` propia (se agregó en la ronda de
      // scheduling). El título es una referencia interna, no el copy real.
      caption: p.caption,
      internalNotes: p.notas,
      titulo: p.titulo,
      turno: p.turno ?? '',
      mediaList: parseMediaList(p.reference_urls),
      pillar: null,
    }
  })

  return [...fromPosts, ...fromPieces]
}
