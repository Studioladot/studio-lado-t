import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { ContentTabs } from './content-tabs'
import { detectWinningItems } from '@/lib/content/winners'

export default async function ContentPage() {
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()

  const [{ data: posts }, { data: pieces }, { data: campaigns }, { data: instagramConnection }, { data: tiktokConnection }] = await Promise.all([
    supabase
      .from('content_posts')
      .select('*')
      .eq('organization_id', activeOrganizationId)
      .order('date', { ascending: false }),
    supabase
      .from('content_piezas')
      .select('*')
      .eq('organization_id', activeOrganizationId)
      .order('fecha_planificada', { ascending: true }),
    supabase
      .from('content_campaigns')
      .select('*')
      .eq('organization_id', activeOrganizationId),
    supabase.from('instagram_connections').select('ig_username, profile_picture_url').eq('organization_id', activeOrganizationId).maybeSingle(),
    // OAuth de TikTok real desde 2026-08-01 (src/app/api/auth/tiktok/callback) — gatea la pestaña "Configuración TikTok" y la sección de Rendimiento.
    supabase.from('tiktok_connections').select('tiktok_username, avatar_url').eq('organization_id', activeOrganizationId).maybeSingle(),
  ])

  // Rendimiento y Comparativa — solo se piden si la red correspondiente
  // está conectada, no tiene sentido pegarle a estas tablas para una
  // organización que nunca sincronizó nada. Las tres corren en paralelo
  // (ninguna depende de las otras).
  //
  // 90 días acá (no 30) porque el DateRangePicker de PerformanceTab ahora
  // ofrece hasta "Últimos 90 días" — el filtrado real por rango pasa del
  // lado del cliente sobre esta misma ventana, así que el server tiene que
  // traer como mínimo el rango más amplio que el picker permite elegir.
  const since90d = new Date(new Date().getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const [{ data: accountInsights }, { data: mediaInsightsRaw }, { data: tiktokVideos }, { data: instagramCatalog }] = await Promise.all([
    instagramConnection
      ? supabase
          .from('instagram_account_insights')
          .select('*')
          .eq('organization_id', activeOrganizationId)
          .gte('captured_at', since90d)
          .order('captured_at', { ascending: true })
      : Promise.resolve({ data: null }),
    // instagram_media_insights ahora es polimórfico (piece_id O post_id) —
    // se embeben las dos relaciones, cada fila solo va a tener una de las
    // dos no-nula (ver constraint en la migración).
    instagramConnection
      ? supabase
          .from('instagram_media_insights')
          .select('*, content_piezas(titulo, ig_permalink, formato, media_type), content_posts(title, ig_permalink, format, media_type)')
          .eq('organization_id', activeOrganizationId)
          .order('captured_at', { ascending: false })
      : Promise.resolve({ data: null }),
    // Catálogo sincronizado del historial de TikTok (Fase 1 del Hub
    // Omnicanal, 2026-08-01) — ver src/lib/tiktok/winners.ts sobre por qué
    // esto no vive en instagram_media_insights.
    tiktokConnection
      ? supabase
          .from('tiktok_videos')
          .select('*')
          .eq('organization_id', activeOrganizationId)
          .order('view_count', { ascending: false })
      : Promise.resolve({ data: null }),
    // Catálogo "zero fricción" del feed histórico de Instagram (Panel de
    // Inteligencia de Contenido, 2026-08-01) — independiente de
    // instagram_media_insights, ver instagram-media-catalog-winners.ts.
    instagramConnection
      ? supabase
          .from('instagram_media_catalog')
          .select('*')
          .eq('organization_id', activeOrganizationId)
          .order('plays', { ascending: false, nullsFirst: false })
      : Promise.resolve({ data: null }),
  ])

  // Cada pieza/publicación puede tener varios snapshots diarios acumulados
  // — para "qué performó mejor" interesa el más reciente de cada una (plays
  // es acumulado, no incremental), no sumar todos los snapshots.
  const latestByItem = new Map<string, NonNullable<typeof mediaInsightsRaw>[number]>()
  for (const row of mediaInsightsRaw ?? []) {
    const key = row.piece_id ?? row.post_id
    if (key && !latestByItem.has(key)) latestByItem.set(key, row)
  }

  // Ganadores (Épica Omnicanal, 2026-08-04): necesita el historial COMPLETO
  // de capturas por ítem (para comparar la penúltima vs. la última), no el
  // `latestByItem` de arriba que ya colapsó todo a 1 fila por ítem — por
  // eso se calcula acá, sobre mediaInsightsRaw, antes de esa reducción.
  const winningItems = detectWinningItems(mediaInsightsRaw ?? [])

  // "¿esto nació en nuestro pipeline?" (pedido real, 2026-08-01): no existe
  // ningún flag dedicado tipo "reel_de_prueba" en el esquema — lo más
  // cercano y honesto es ig_media_id, que posts/piezas ya guardan cuando
  // instagram-publish-run publica con éxito. Si el ig_media_id de un ítem
  // del catálogo zero-fricción aparece acá, es porque Gotix lo publicó.
  const gotixMediaIds = new Set<string>(
    [...(posts ?? []), ...(pieces ?? [])].map((item) => item.ig_media_id).filter((id): id is string => !!id)
  )

  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Contenido</h1>
        <p className="mt-0.5 text-[13px] text-text-2">
          Planificación, control y ranking de tu estrategia de contenido
        </p>
      </div>

      <ContentTabs
        posts={posts ?? []}
        pieces={pieces ?? []}
        campaigns={campaigns ?? []}
        instagramConnected={!!instagramConnection}
        igUsername={instagramConnection?.ig_username ?? null}
        tiktokConnected={!!tiktokConnection}
        tiktokVideos={tiktokVideos ?? []}
        instagramCatalog={instagramCatalog ?? []}
        gotixMediaIds={gotixMediaIds}
        accountInsights={accountInsights ?? []}
        mediaInsights={[...latestByItem.values()]}
        winningItems={winningItems}
      />
    </div>
  )
}
