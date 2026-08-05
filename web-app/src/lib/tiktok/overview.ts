import { interactionsTotal, type TiktokVideoRow } from './winners'

// KPIs de "Nivel 1" para TikTok (Paridad de Plataformas, 2026-08-06) — a
// diferencia de Instagram, TikTok no tiene un endpoint de Insights a nivel
// cuenta (ni una tabla de snapshots diarios): la Display API (video.list)
// solo da el catálogo de videos con sus contadores vigentes. Por eso estos
// KPIs se calculan sobre el CATÁLOGO ya filtrado por rango de fechas (por
// posted_at), no sobre una serie de cuenta como en Instagram — y "Nuevos
// Seguidores" no tiene equivalente real acá (no hay tracking de
// seguidores), se reemplaza por "Promedio de Vistas por Video".

export type TiktokOverviewKpis = {
  totalViews: number
  totalInteractions: number
  engagementRate: number | null
  avgViewsPerVideo: number | null
}

export function computeTiktokOverviewKpis(videos: TiktokVideoRow[]): TiktokOverviewKpis {
  const totalViews = videos.reduce((sum, v) => sum + v.view_count, 0)
  const totalInteractions = videos.reduce((sum, v) => sum + interactionsTotal(v), 0)
  const engagementRate = totalViews > 0 ? (totalInteractions / totalViews) * 100 : null
  const avgViewsPerVideo = videos.length > 0 ? totalViews / videos.length : null

  return { totalViews, totalInteractions, engagementRate, avgViewsPerVideo }
}
