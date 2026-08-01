// Íconos reales portados de app.html (legacy) — mismo criterio que sidebar-nav.tsx,
// no inventados salvo donde se indica explícitamente (ver frontend-taste.md).
// Centralizados acá para que el sidebar y las páginas placeholder usen el mismo ícono.

type IconProps = { size?: number }

export function DashboardIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="1" y="1" width="7" height="7" rx="1.5" />
      <rect x="10" y="1" width="7" height="7" rx="1.5" />
      <rect x="1" y="10" width="7" height="7" rx="1.5" />
      <rect x="10" y="10" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function MetaConnectionsIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="9" r="3" />
      <circle cx="13" cy="9" r="3" />
      <path d="M8 9h2" />
    </svg>
  )
}

export function MetaCampaignsIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v4l8 3V4L3 7z" />
      <path d="M3 11l-1.5 3" />
      <path d="M11 5.5c1 .5 2 2 2 3.5s-1 3-2 3.5" />
      <path d="M11 3c2 1 3.5 3 3.5 6S13 13 11 14" />
    </svg>
  )
}

export function MetaSnapshotsIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2V5z" />
      <circle cx="9" cy="9" r="2.5" />
      <path d="M9 3.5V5M9 13v1.5" />
    </svg>
  )
}

export function MetaHistoryIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5v4l3 2" />
      <circle cx="9" cy="9" r="7" />
    </svg>
  )
}

export function MetaLibraryIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="1" y="1" width="7" height="9" rx="1.5" />
      <rect x="10" y="1" width="7" height="5" rx="1.5" />
      <rect x="10" y="8" width="7" height="9" rx="1.5" />
      <rect x="1" y="12" width="7" height="5" rx="1.5" />
    </svg>
  )
}

export function MetaMetricsIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 15h16" />
      <path d="M3 15V9" />
      <path d="M7 15V6" />
      <path d="M11 15V3" />
      <path d="M15 15V8" />
    </svg>
  )
}

export function ContentControlIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="1" y="1" width="7" height="4" rx="1" />
      <rect x="10" y="1" width="7" height="4" rx="1" />
      <rect x="1" y="7" width="7" height="10" rx="1" />
      <rect x="10" y="7" width="7" height="10" rx="1" />
    </svg>
  )
}

export function ContentCampaignsIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="1" y="3" width="16" height="14" rx="2" />
      <path d="M1 8h16" />
      <path d="M6 1v4M12 1v4" />
      <circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ContentScriptsIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="1" width="12" height="16" rx="2" />
      <path d="M6 6h6M6 9h6M6 12h4" />
    </svg>
  )
}

export function ContentNotesIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14l2-5.5L14.5 1l3 3L9 12.5z" />
      <path d="M4 14h4" />
      <path d="M10.5 3.5l3 3" />
    </svg>
  )
}

// TikTok, Shopify, Google Analytics (Hub de Integraciones, 2026-08-05) —
// ninguno de los tres tiene un asset de marca real subido a public/ (a
// diferencia de meta.svg/tiendanube.png, que la PO subió a mano) — mismo
// criterio ya establecido con Instagram: glifo propio, thin-stroke, no un
// intento de reproducir el isologo oficial de memoria.
export function TiktokIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2v8.5a2.5 2.5 0 1 1-2.5-2.5" />
      <path d="M11 2c.4 2 2 3.4 4 3.6" />
    </svg>
  )
}

export function ShopifyIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 6l.7-2.5A1.5 1.5 0 0 1 6.65 2.5h1.2" />
      <path d="M13.5 6l-.7-2.5A1.5 1.5 0 0 0 11.35 2.5h-1.2" />
      <path d="M4.5 6h9l.7 9a1.5 1.5 0 0 1-1.5 1.5H5.3a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M7 8.5c0-.8.9-1 2-1s2 .3 2 1" />
    </svg>
  )
}

export function GoogleAnalyticsIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15V9" />
      <path d="M9 15V5" />
      <path d="M14 15V3" />
    </svg>
  )
}

// Ícono de Instagram — mismo criterio "sin emoji, SVG propio" que el resto
// de este archivo, no el logo oficial (asset con licencia). El gradiente
// es lo que lo hace reconocible sin necesitar el asset real — pedido
// explícito de la PO para la tarjeta de conexión dedicada (2026-07-31).
export function InstagramIcon({ size = 16, gradient = false }: IconProps & { gradient?: boolean }) {
  const gradientId = 'instagram-icon-gradient'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradient ? `url(#${gradientId})` : 'currentColor'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {gradient && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="24" x2="24" y2="0">
            <stop offset="0%" stopColor="#FFC107" />
            <stop offset="45%" stopColor="#E1306C" />
            <stop offset="100%" stopColor="#5851DB" />
          </linearGradient>
        </defs>
      )}
      <rect x="2" y="2" width="20" height="20" rx="6" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="0.6" fill={gradient ? `url(#${gradientId})` : 'currentColor'} stroke="none" />
    </svg>
  )
}

export function TiendaNubeIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6l1.5-3.5h9L15 6" />
      <path d="M3 6v8a1 1 0 001 1h10a1 1 0 001-1V6" />
      <path d="M7 15v-4a1 1 0 011-1h2a1 1 0 011 1v4" />
      <path d="M3 6h12" />
    </svg>
  )
}

// Sin precedente directo en app.html (el legacy solo tiene un ítem combinado
// "Ventas y Operaciones" con el ícono de tienda de arriba). Ícono de tendencia
// genérico en el mismo estilo (trazo 1.5, esquinas redondeadas), no una paleta nueva.
export function SalesIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 13l4.5-5 3 3 6-6.5" />
      <path d="M11.5 3.5H15.5V7.5" />
    </svg>
  )
}

export function BrandJournalIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="1" width="12" height="16" rx="1.5" />
      <path d="M6 5h6M6 8h6M6 11h4" />
    </svg>
  )
}

export function AutopilotIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="7.5" />
      <path d="M9 5v4l2.5 2.5" />
      <path d="M3.5 3.5l11 11" />
    </svg>
  )
}

export function StrategyIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1L10.5 6H16L11.5 9.5 13 14.5 9 11.5 5 14.5 6.5 9.5 2 6H7.5z" />
    </svg>
  )
}

export function SettingsProfileIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="2.5" />
      <path d="M9 1v2M9 15v2M3 4.5l1.4 1.4M14 12.1l-1.4-1.4M3 13.5l1.4-1.4M14 5.9l-1.4 1.4" />
    </svg>
  )
}

export function TeamIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="5" r="2.5" />
      <path d="M1.5 15.5c0-2.5 2-4.5 5-4.5s5 2 5 4.5" />
      <circle cx="13" cy="6" r="2" />
      <path d="M11 11.2c1.8.3 3.2 1.7 3.5 3.8" />
    </svg>
  )
}

export function BillingIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="4" width="15" height="10" rx="1.5" />
      <path d="M1.5 7.5h15" />
    </svg>
  )
}

// Hub de Integraciones (2026-08-05) — reemplaza los links sueltos de Meta
// Ads/Tienda Nube que vivían en este clúster de Ajustes: un solo enchufe
// genérico, no el logo de ninguna plataforma en particular (para eso están
// BrandLogo/TiktokIcon/etc. dentro de cada tarjeta del hub).
export function IntegrationsIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 8.5l3-3" />
      <rect x="1.5" y="9.5" width="4" height="4" rx="1" transform="rotate(-45 3.5 11.5)" />
      <rect x="12.5" y="4.5" width="4" height="4" rx="1" transform="rotate(-45 14.5 6.5)" />
    </svg>
  )
}

// Sin precedente SVG en app.html: el legado usa entidades HTML (&#9728; sol,
// &#9789; luna) para el botón .dm-switch, no íconos vectoriales — se dibujan
// acá desde cero pero en el mismo trazo/viewBox que el resto de este archivo.
export function SunIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="9" cy="9" r="3.5" />
      <path d="M9 1.5v2M9 14.5v2M16.5 9h-2M3.5 9h-2M14.3 3.7l-1.4 1.4M5.1 12.9l-1.4 1.4M14.3 14.3l-1.4-1.4M5.1 5.1L3.7 3.7" />
    </svg>
  )
}

export function MoonIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 10.8A6.5 6.5 0 117.2 2.5a5.2 5.2 0 008.3 8.3z" />
    </svg>
  )
}

// Rentabilidad a nivel cuenta (sidebar, grupo Meta Ads) — barras ascendentes,
// sin precedente en app.html.
export function ProfitabilityIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16V10M8 16V6M14 16V2" />
      <path d="M2 6l5-3 5 2 5-3" />
    </svg>
  )
}

// Tooltips educativos (Calculadora de Unit Economics) — círculo + "i", trazo
// fino, mismo criterio que el resto. Sin precedente en app.html.
export function InfoIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="7.5" />
      <path d="M9 8.25v4.5" />
      <circle cx="9" cy="5.75" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Automatización/Protocolos — a propósito distinto de SettingsProfileIcon
// (engranaje, ya usado por Ajustes) para no confundir "automatizar esta
// campaña" con "configuración de la cuenta". Sin precedente en app.html.
export function AutomationIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 1.5L4 10h4.5L8 16.5 14 8H9.5z" />
    </svg>
  )
}
