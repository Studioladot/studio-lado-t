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
    // tiktok_connections existe desde la Épica Omnicanal (2026-08-04) pero
    // todavía no hay ningún flujo de OAuth real que inserte filas ahí (Fase
    // 2, pendiente de credenciales de TikTok) — esta lectura ya deja lista
    // la gating de la pestaña "Configuración TikTok" para el día que exista.
    supabase.from('tiktok_connections').select('tiktok_username, avatar_url').eq('organization_id', activeOrganizationId).maybeSingle(),
  ])

  // Rendimiento y Comparativa — solo se piden si hay Instagram conectado,
  // no tiene sentido pegarle a estas tablas para una organización que
  // nunca sincronizó nada.
  const since30d = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const [{ data: accountInsights }, { data: mediaInsightsRaw }] = instagramConnection
    ? await Promise.all([
        supabase
          .from('instagram_account_insights')
          .select('*')
          .eq('organization_id', activeOrganizationId)
          .gte('captured_at', since30d)
          .order('captured_at', { ascending: true }),
        // instagram_media_insights ahora es polimórfico (piece_id O
        // post_id) — se embeben las dos relaciones, cada fila solo va a
        // tener una de las dos no-nula (ver constraint en la migración).
        supabase
          .from('instagram_media_insights')
          .select('*, content_piezas(titulo, ig_permalink, formato, media_type), content_posts(title, ig_permalink, format, media_type)')
          .eq('organization_id', activeOrganizationId)
          .order('captured_at', { ascending: false }),
      ])
    : [{ data: null }, { data: null }]

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
        accountInsights={accountInsights ?? []}
        mediaInsights={[...latestByItem.values()]}
        winningItems={winningItems}
      />
    </div>
  )
}
