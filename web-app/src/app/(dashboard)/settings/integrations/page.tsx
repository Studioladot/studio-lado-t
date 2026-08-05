import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getMetaAdsInsights } from '@/lib/meta/insights'
import { META_OAUTH_SCOPE } from '@/lib/meta/oauth'
import {
  connectMetaAction,
  disconnectMetaAction,
  disconnectInstagramAction,
  connectTiktokAction,
  disconnectTiktokAction,
  connectTiendaNubeAction,
  disconnectTiendaNubeAction,
} from '../../actions'
import { changeMetaAccountAction } from '../../meta-ads/connections/select-account/actions'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { InstagramIcon, TiktokIcon, ShopifyIcon, GoogleAnalyticsIcon } from '@/components/features/nav-icons'
import { BrandLogo } from '@/components/features/brand-logo'
import { IntegrationCard } from './integration-card'

const SCOPE_LABEL: Record<string, string> = {
  ads_read: 'Leer métricas de campañas y anuncios',
  ads_management: 'Gestionar campañas y anuncios',
  business_management: 'Administrar el Business Manager',
  pages_show_list: 'Ver las Páginas de Facebook que administrás',
  pages_read_engagement: 'Leer la cuenta de Instagram vinculada a tus Páginas',
  instagram_basic: 'Ver tu perfil de Instagram',
  instagram_manage_insights: 'Leer métricas de tu Instagram',
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PRIMARY_BUTTON =
  'w-full rounded-control bg-primary px-4 py-2 text-center text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover hover:shadow-[0_0_28px_var(--primary-glow),0_0_8px_rgba(45,91,138,0.2)] active:scale-[0.98]'

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    meta_connected?: string
    meta_error?: string
    tiktok_connected?: string
    tiktok_error?: string
    tn_connected?: string
    tn_error?: string
  }>
}) {
  const { meta_connected, meta_error, tiktok_connected, tiktok_error, tn_connected, tn_error } = await searchParams
  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const [{ data: metaConnection }, { data: igConnection }, { data: tiktokConnection }, { data: tnConnection }] =
    await Promise.all([
      supabase
        .from('meta_connections')
        .select('account_id, account_name, expires_at, token, created_at')
        .eq('organization_id', activeOrganizationId)
        .maybeSingle(),
      supabase
        .from('instagram_connections')
        .select('ig_username, page_name, profile_picture_url, connected_at')
        .eq('organization_id', activeOrganizationId)
        .maybeSingle(),
      supabase
        .from('tiktok_connections')
        .select('tiktok_username, avatar_url, connected_at')
        .eq('organization_id', activeOrganizationId)
        .maybeSingle(),
      supabase
        .from('tiendanube_connections')
        .select('store_id, store_name, store_url, connected_at')
        .eq('organization_id', activeOrganizationId)
        .maybeSingle(),
    ])

  const metaTokenExpired = metaConnection?.expires_at ? new Date(metaConnection.expires_at) < new Date() : false
  const metaHealth =
    metaConnection && !metaTokenExpired ? await getMetaAdsInsights(metaConnection.token, metaConnection.account_id) : null

  // Un solo banner por vez — los 3 flujos de OAuth (Meta, TikTok, Tienda
  // Nube) devuelven acá con su propio par de query params, mismo criterio
  // que las páginas dedicadas que reemplaza (no hay forma de que dos
  // flujos terminen a la vez, son navegaciones de página completa).
  const banner = meta_connected
    ? { tone: 'ok' as const, message: 'Meta Ads conectado correctamente.' }
    : meta_error
      ? { tone: 'error' as const, message: meta_error }
      : tiktok_connected
        ? { tone: 'ok' as const, message: 'TikTok conectado correctamente.' }
        : tiktok_error
          ? { tone: 'error' as const, message: tiktok_error }
          : tn_connected
            ? { tone: 'ok' as const, message: 'Tienda Nube conectada correctamente.' }
            : tn_error
              ? { tone: 'error' as const, message: tn_error }
              : null

  return (
    <div className="mx-auto max-w-[1040px]">
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Integraciones</h1>
        <p className="mt-0.5 text-[13px] text-text-2">Conectá las plataformas que alimentan a Gotix con datos reales.</p>
      </div>

      {banner && (
        <div
          className={`mb-4 rounded-control border px-4 py-2.5 text-sm ${
            banner.tone === 'ok' ? 'border-green/30 bg-green/[8%] text-green' : 'border-red/30 bg-red/[8%] text-red'
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Meta Ads */}
        <IntegrationCard
          icon={<BrandLogo brand="meta" size={18} />}
          name="Meta Ads"
          description="Campañas, métricas y autopiloto de Facebook e Instagram Ads."
          connected={!!metaConnection}
          statusLabel={metaTokenExpired ? 'Conexión vencida' : 'Conectado'}
          connectSlot={
            <form action={connectMetaAction}>
              <button type="submit" className={PRIMARY_BUTTON}>
                Conectar
              </button>
            </form>
          }
          manageSlot={
            metaConnection && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">{metaConnection.account_name ?? `Cuenta ${metaConnection.account_id}`}</p>
                  <p className="mt-0.5 text-xs text-text-2">ID {metaConnection.account_id}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-bold uppercase tracking-wide text-text-3">Conectado desde</p>
                    <p className="mt-0.5 text-text">{metaConnection.created_at ? formatDate(metaConnection.created_at) : '—'}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wide text-text-3">Token válido hasta</p>
                    <p className={`mt-0.5 ${metaTokenExpired ? 'text-red' : 'text-text'}`}>
                      {metaConnection.expires_at ? formatDate(metaConnection.expires_at) : '—'}
                    </p>
                  </div>
                </div>
                <p className={`text-xs ${metaTokenExpired ? 'text-text-3' : metaHealth?.ok ? 'text-green' : 'text-red'}`}>
                  {metaTokenExpired
                    ? 'Sin verificar'
                    : metaHealth?.ok
                      ? `API funcionando · ${metaHealth.ads.length} anuncios activos`
                      : (metaHealth?.ok === false ? metaHealth.error : 'Con errores')}
                </p>
                <details className="text-xs text-text-2">
                  <summary className="cursor-pointer font-semibold text-text-3">Permisos solicitados</summary>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {META_OAUTH_SCOPE.split(',').map((scope) => (
                      <li key={scope}>{SCOPE_LABEL[scope] ?? scope}</li>
                    ))}
                  </ul>
                </details>
                <div className="flex items-center gap-3 border-t border-border pt-3">
                  {metaTokenExpired ? (
                    <form action={connectMetaAction}>
                      <button type="submit" className="text-xs font-semibold text-accent hover:text-accent/80">
                        Reconectar
                      </button>
                    </form>
                  ) : (
                    <form action={changeMetaAccountAction}>
                      <button type="submit" className="text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text">
                        Cambiar cuenta
                      </button>
                    </form>
                  )}
                  <span className="text-border-2">·</span>
                  <form action={disconnectMetaAction}>
                    <ConfirmSubmitButton
                      confirmMessage="¿Desconectar Meta Ads? Vas a tener que volver a autorizar para reconectar."
                      className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                    >
                      Desconectar
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            )
          }
        />

        {/* Instagram */}
        <IntegrationCard
          icon={<InstagramIcon gradient size={18} />}
          name="Instagram"
          description="Publicación automática y métricas de tu Instagram Business o Creator."
          connected={!!igConnection}
          connectSlot={
            <form action={connectMetaAction}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-control px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_rgba(225,48,108,0.35)] transition-all duration-200 ease-out active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#FFC107,#E1306C,#5851DB)' }}
              >
                <InstagramIcon size={13} />
                Conectar Instagram
              </button>
            </form>
          }
          manageSlot={
            igConnection && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">@{igConnection.ig_username}</p>
                  <p className="mt-0.5 text-xs text-text-2">Vinculado vía la Página &ldquo;{igConnection.page_name}&rdquo;</p>
                </div>
                <p className="text-xs text-text-2">
                  Conectado desde {igConnection.connected_at ? formatDate(igConnection.connected_at) : '—'}
                </p>
                <div className="border-t border-border pt-3">
                  <form action={disconnectInstagramAction}>
                    <ConfirmSubmitButton
                      confirmMessage="¿Desconectar Instagram? Las piezas programadas van a dejar de auto-publicarse."
                      className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                    >
                      Desconectar
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            )
          }
        />

        {/* TikTok */}
        <IntegrationCard
          icon={<TiktokIcon size={18} />}
          name="TikTok"
          description="Publicación y métricas de tu cuenta de TikTok Business."
          connected={!!tiktokConnection}
          connectSlot={
            <form action={connectTiktokAction}>
              <button type="submit" className={PRIMARY_BUTTON}>
                Conectar
              </button>
            </form>
          }
          manageSlot={
            tiktokConnection && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2">
                    {tiktokConnection.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- avatar remoto de la API de TikTok.
                      <img src={tiktokConnection.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <TiktokIcon size={14} />
                    )}
                  </span>
                  <p className="text-sm font-semibold text-text">@{tiktokConnection.tiktok_username}</p>
                </div>
                <p className="text-xs text-text-2">La publicación automática todavía es Fase 2.</p>
                <div className="border-t border-border pt-3">
                  <form action={disconnectTiktokAction}>
                    <ConfirmSubmitButton
                      confirmMessage="¿Desconectar TikTok? Vas a tener que volver a autorizar para reconectar."
                      className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                    >
                      Desconectar
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            )
          }
        />

        {/* Tienda Nube */}
        <IntegrationCard
          icon={<BrandLogo brand="tiendanube" size={18} />}
          name="Tienda Nube"
          description="Ventas reales sincronizadas para Rentabilidad Neta y Operaciones."
          connected={!!tnConnection}
          connectSlot={
            <form action={connectTiendaNubeAction}>
              <button type="submit" className={PRIMARY_BUTTON}>
                Conectar
              </button>
            </form>
          }
          manageSlot={
            tnConnection && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">{tnConnection.store_name ?? `Tienda ${tnConnection.store_id}`}</p>
                  {tnConnection.store_url && <p className="mt-0.5 truncate text-xs text-text-2">{tnConnection.store_url}</p>}
                </div>
                <p className="text-xs text-text-2">
                  Conectado desde {tnConnection.connected_at ? formatDate(tnConnection.connected_at) : '—'}
                </p>
                <div className="border-t border-border pt-3">
                  <form action={disconnectTiendaNubeAction}>
                    <ConfirmSubmitButton
                      confirmMessage="¿Desconectar Tienda Nube? Vas a tener que volver a autorizar para reconectar."
                      className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                    >
                      Desconectar
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            )
          }
        />

        {/* Shopify — sin app de developer todavía, mismo criterio que TikTok
            antes de tener credenciales: tarjeta visible pero deshabilitada,
            no una promesa de fecha. */}
        <IntegrationCard
          icon={<ShopifyIcon size={18} />}
          name="Shopify"
          description="Ventas reales sincronizadas, igual que Tienda Nube."
          connected={false}
          disabled
          disabledReason="Todavía no tiene una app de developer configurada."
        />

        {/* Google Analytics — ídem. */}
        <IntegrationCard
          icon={<GoogleAnalyticsIcon size={18} />}
          name="Google Analytics"
          description="Tráfico y conversión del sitio, cruzado con el gasto en ads."
          connected={false}
          disabled
          disabledReason="Todavía no tiene una app de developer configurada."
        />
      </div>
    </div>
  )
}
