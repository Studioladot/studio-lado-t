import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import {
  connectMetaAction,
  connectTiendaNubeAction,
  disconnectMetaAction,
  disconnectTiendaNubeAction,
} from '../actions'
import { getMetaAdsInsights } from '@/lib/meta/insights'
import { getTiendaNubeOrders, summarizeOrders } from '@/lib/tiendanube/orders'
import { getOrganizationRunLog, type OrgRunLogEntry } from '@/lib/meta/autopilot'
import { formatMoney, type Currency } from '@/lib/currency'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { StartChecklist } from './start-checklist'

// Command Center real (bloque de corrección, 2026-08-03) — reemplaza el
// hero de video decorativo (sin reproducción real, "Onboarding · 3:42" era
// solo una etiqueta) y los 2 controles que no hacían nada (el selector de
// período no tenía handler ni action, "+ Cargar métricas" tampoco). Un
// dashboard "real" no puede tener controles falsos — se sacan en vez de
// dejarlos de adorno. Los 3 widgets que sí pidió la PO: ventas del día
// (Tienda Nube), top anuncios activos (Meta), alertas del Autopiloto.

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col justify-between gap-3 bg-surface p-5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-text-3">{label}</span>
      <div>
        <span className="text-2xl font-extrabold leading-none tracking-[-0.03em] tabular-nums text-text">{value}</span>
        {sub && <p className="mt-1 text-xs text-text-2">{sub}</p>}
      </div>
    </div>
  )
}

function EmptyStateCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 rounded-card border border-dashed border-border bg-surface-2/40 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="max-w-[280px] text-xs text-text-2">{subtitle}</p>
    </div>
  )
}

const RUN_LOG_ACTION_LABEL: Record<string, string> = {
  pause: 'Pausó',
  increase_budget: 'Subió presupuesto',
  reduce_budget: 'Bajó presupuesto',
  rotate_creative: 'Rotó creativo',
  notify: 'Aviso',
  error: 'Error',
}

function AutopilotAlertsCard({ entries }: { entries: OrgRunLogEntry[] }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Alertas del Autopiloto</p>
      {entries.length === 0 ? (
        <EmptyStateCard title="Sin actividad reciente" subtitle="El Autopiloto corre cada hora y solo actúa sobre playbooks prendidos." />
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={`rounded-control border px-3 py-2.5 ${
                entry.action === 'error' ? 'border-red/30 bg-red/[6%]' : 'border-border bg-surface-2/60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {entry.campaignName && <span className="text-[10px] font-semibold text-text-3">{entry.campaignName}</span>}
                <span className={`text-[10px] font-bold uppercase tracking-wide ${entry.action === 'error' ? 'text-red' : 'text-text-3'}`}>
                  {RUN_LOG_ACTION_LABEL[entry.action] ?? entry.action}
                </span>
              </div>
              <p className={`mt-0.5 text-xs leading-relaxed ${entry.action === 'error' ? 'text-red' : 'text-text-2'}`}>{entry.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    tn_connected?: string
    tn_error?: string
  }>
}) {
  const { tn_connected: tnConnected, tn_error: tnError } = await searchParams
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
        <p className="max-w-sm text-sm text-text-2">
          Pedile a un administrador que te invite, o creá una organización nueva para empezar.
        </p>
      </div>
    )
  }

  const supabase = await createClient()

  const now = new Date()
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const startOfTodayISO = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const [
    { count: activeCampaigns },
    { count: totalCampaigns },
    { count: publishedThisMonth },
    { count: pendingPosts },
    { data: metaConnection },
    { data: tiendaNubeConnection },
    autopilotAlerts,
    { count: totalPosts },
    { count: totalScripts },
  ] = await Promise.all([
    supabase
      .from('content_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', activeOrganizationId)
      .eq('status', 'activa'),
    supabase
      .from('content_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', activeOrganizationId),
    supabase
      .from('content_posts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', activeOrganizationId)
      .in('status', ['publicado', 'publicada'])
      .gte('date', startOfMonth),
    supabase
      .from('content_posts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', activeOrganizationId)
      .eq('status', 'pendiente'),
    supabase
      .from('meta_connections')
      .select('account_name, expires_at, token, account_id, account_currency')
      .eq('organization_id', activeOrganizationId)
      .maybeSingle(),
    supabase
      .from('tiendanube_connections')
      .select('store_name, store_url, access_token, store_id')
      .eq('organization_id', activeOrganizationId)
      .maybeSingle(),
    getOrganizationRunLog(supabase, activeOrganizationId, 5),
    // "Checklist de Inicio" (2026-08-08) — mismos 3 pasos que reemplazan el
    // modal viejo: Conectar Meta ya se resuelve arriba con metaConnection,
    // estos 2 counts son los que faltaban.
    supabase.from('content_posts').select('*', { count: 'exact', head: true }).eq('organization_id', activeOrganizationId),
    supabase.from('scripts').select('*', { count: 'exact', head: true }).eq('organization_id', activeOrganizationId),
  ])

  const tokenExpired = metaConnection?.expires_at
    ? new Date(metaConnection.expires_at) < new Date()
    : false
  const accountCurrency: Currency = metaConnection?.account_currency === 'ARS' ? 'ARS' : 'USD'

  // Bug de performance real (2026-08-21): esto pedía 30 días completos de
  // órdenes (hasta 20 páginas secuenciales contra la API de Tienda Nube,
  // ver getTiendaNubeOrders) solo para filtrar en memoria y quedarse con
  // las de HOY — el Dashboard es la pantalla más visitada de toda la app,
  // así que este sobre-fetch pegaba en cada login/navegación. Ahora se
  // pide directamente el rango de hoy — normalmente una sola página.
  const ordersSince = new Date(startOfTodayISO)
  const ordersUntil = new Date()

  const [metaInsights, tiendaNubeOrdersResult] = await Promise.all([
    metaConnection && !tokenExpired
      ? getMetaAdsInsights(metaConnection.token, metaConnection.account_id)
      : Promise.resolve(null),
    tiendaNubeConnection
      ? getTiendaNubeOrders(tiendaNubeConnection.access_token, tiendaNubeConnection.store_id, ordersSince, ordersUntil)
      : Promise.resolve(null),
  ])

  const todaySummary = tiendaNubeOrdersResult && tiendaNubeOrdersResult.ok ? summarizeOrders(tiendaNubeOrdersResult.orders) : null
  const tiendaNubeError = tiendaNubeOrdersResult && !tiendaNubeOrdersResult.ok ? tiendaNubeOrdersResult.error : null
  const aovToday = todaySummary && todaySummary.ordenes > 0 ? Math.round(todaySummary.bruto / todaySummary.ordenes) : 0

  const topAds = metaInsights?.ok ? [...metaInsights.ads].sort((a, b) => b.spend - a.spend).slice(0, 5) : []

  const banner = tnConnected
    ? { tone: 'ok' as const, message: 'Tienda Nube conectado correctamente.' }
    : tnError
      ? { tone: 'error' as const, message: tnError }
      : null

  const startChecklistItems = [
    { label: 'Conectar Meta', done: !!metaConnection },
    { label: 'Crear tu primera publicación', done: (totalPosts ?? 0) > 0 },
    { label: 'Armar un guion', done: (totalScripts ?? 0) > 0 },
  ]

  return (
    <div>
      <StartChecklist items={startChecklistItems} />

      {banner && (
        <div
          className={`mb-4 rounded-control border px-4 py-2.5 text-sm ${
            banner.tone === 'ok' ? 'border-green/30 bg-green/[8%] text-green' : 'border-red/30 bg-red/[8%] text-red'
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Dashboard</h1>
        <p className="mt-0.5 text-[13px] text-text-2">Command Center — cómo viene tu negocio hoy</p>
      </div>

      <div className="mb-3.5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-text-3">Ventas de hoy</p>
        {!tiendaNubeConnection ? (
          <EmptyStateCard title="Tu facturación empieza acá" subtitle="Conectá Tienda Nube para ver tus ventas de hoy en tiempo real, sin entrar a otro panel." />
        ) : tiendaNubeError ? (
          <div className="rounded-card border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">{tiendaNubeError}</div>
        ) : todaySummary ? (
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-4">
            <KpiCard label="Facturación Bruta" value={`$${todaySummary.bruto.toLocaleString('es-AR')}`} />
            <KpiCard label="Facturación Neta" value={`$${todaySummary.neto.toLocaleString('es-AR')}`} />
            <KpiCard label="Órdenes" value={String(todaySummary.ordenes)} />
            <KpiCard label="Ticket Promedio" value={todaySummary.ordenes > 0 ? `$${aovToday.toLocaleString('es-AR')}` : '—'} />
          </div>
        ) : null}
      </div>

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Top anuncios activos (7 días)</p>
          {!metaConnection ? (
            <EmptyStateCard title="Tu estrategia empieza acá" subtitle="Conectá tu cuenta de Meta para ver tu primera métrica de anuncios en este mismo panel." />
          ) : tokenExpired ? (
            <div className="rounded-control border border-amber/30 bg-amber/[8%] px-4 py-3 text-sm text-amber">
              Tu conexión con Meta Ads venció — reconectá para ver métricas actualizadas.
            </div>
          ) : metaInsights && !metaInsights.ok ? (
            <div className="rounded-control border border-red/30 bg-red/[8%] px-4 py-3 text-sm text-red">{metaInsights.error}</div>
          ) : topAds.length === 0 ? (
            <EmptyStateCard title="Sin anuncios activos" subtitle="No hay anuncios corriendo en este momento." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-divider text-left text-[10px] font-bold uppercase tracking-wide text-text-3">
                    <th className="px-2 py-2">Anuncio</th>
                    <th className="px-2 py-2 text-right">Gasto</th>
                    <th className="px-2 py-2 text-right">ROAS</th>
                    <th className="px-2 py-2 text-right">Compras</th>
                  </tr>
                </thead>
                <tbody>
                  {topAds.map((ad) => (
                    <tr key={ad.adId} className="border-b border-divider last:border-0">
                      <td className="min-w-0 px-2 py-2">
                        <p className="truncate text-xs font-semibold text-text">{ad.name}</p>
                        <p className="truncate text-[10px] text-text-3">{ad.campaignName}</p>
                      </td>
                      <td className="px-2 py-2 text-right text-xs tabular-nums text-text">{formatMoney(ad.spend, accountCurrency)}</td>
                      <td className={`px-2 py-2 text-right text-xs font-semibold tabular-nums ${ad.roas >= 2 ? 'text-green' : 'text-red'}`}>
                        {ad.roas.toFixed(2)}x
                      </td>
                      <td className="px-2 py-2 text-right text-xs tabular-nums text-text-2">{ad.purchases}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <AutopilotAlertsCard entries={autopilotAlerts} />
      </div>

      <div className="mb-3.5 grid grid-cols-1 gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-3">
        <KpiCard label="Campañas activas" value={String(activeCampaigns ?? 0)} sub={`de ${totalCampaigns ?? 0} totales`} />
        <KpiCard label="Publicado este mes" value={String(publishedThisMonth ?? 0)} sub="posts" />
        <KpiCard label="Por publicar" value={String(pendingPosts ?? 0)} sub="pendientes" />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-text-3">Integraciones</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2.5 rounded-card border border-border bg-surface px-4 py-3">
            <span
              className={`h-2 w-2 rounded-full ${metaConnection ? 'bg-green' : 'bg-text-3'}`}
              aria-hidden="true"
            />
            <span className="text-[11px] font-bold uppercase tracking-wide text-text-3">Meta Ads</span>
            {metaConnection ? (
              <>
                <span className="text-sm font-medium text-text">
                  {metaConnection.account_name ?? 'Conectado'}
                </span>
                <form action={disconnectMetaAction}>
                  <ConfirmSubmitButton
                    confirmMessage="¿Desconectar Meta Ads? Vas a tener que volver a autorizar para reconectar."
                    className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                  >
                    Desconectar
                  </ConfirmSubmitButton>
                </form>
              </>
            ) : (
              <form action={connectMetaAction}>
                <button
                  type="submit"
                  className="text-sm font-medium text-primary transition-colors duration-200 ease-out hover:text-primary-hover"
                >
                  Conectar
                </button>
              </form>
            )}
          </div>

          <div className="flex items-center gap-2.5 rounded-card border border-border bg-surface px-4 py-3">
            <span
              className={`h-2 w-2 rounded-full ${tiendaNubeConnection ? 'bg-green' : 'bg-text-3'}`}
              aria-hidden="true"
            />
            <span className="text-[11px] font-bold uppercase tracking-wide text-text-3">
              Tienda Nube
            </span>
            {tiendaNubeConnection ? (
              <>
                <span className="text-sm font-medium text-text">
                  {tiendaNubeConnection.store_name ?? 'Conectado'}
                </span>
                <form action={disconnectTiendaNubeAction}>
                  <ConfirmSubmitButton
                    confirmMessage="¿Desconectar Tienda Nube? Vas a tener que volver a autorizar para reconectar."
                    className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                  >
                    Desconectar
                  </ConfirmSubmitButton>
                </form>
              </>
            ) : (
              <form action={connectTiendaNubeAction}>
                <button
                  type="submit"
                  className="text-sm font-medium text-primary transition-colors duration-200 ease-out hover:text-primary-hover"
                >
                  Conectar
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
