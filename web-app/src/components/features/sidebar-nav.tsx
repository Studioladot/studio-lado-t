'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import {
  DashboardIcon,
  MetaCampaignsIcon,
  ProfitabilityIcon,
  MetaSnapshotsIcon,
  MetaHistoryIcon,
  MetaLibraryIcon,
  MetaMetricsIcon,
  ContentControlIcon,
  ContentCampaignsIcon,
  ContentScriptsIcon,
  ContentNotesIcon,
  SalesIcon,
  BrandJournalIcon,
  AutopilotIcon,
  StrategyIcon,
  SettingsProfileIcon,
  TeamIcon,
  BillingIcon,
  IntegrationsIcon,
} from './nav-icons'
import { ThemeToggle } from './theme-toggle'
import { CurrencyToggle } from './currency-toggle'
import { TrialBanner } from './trial-banner'

type NavItem = { href: string; label: string; icon: ReactNode }
// Sub-encabezado puramente visual dentro de un grupo ya desplegable (ej. "Integraciones"
// adentro de Ajustes) — no es un acordeón propio, no tiene toggle ni estado: el objetivo
// es agrupar visualmente sin sumar otro nivel de interacción a la navegación. `divider`
// agrega una regla fina arriba para separar el clúster del anterior sin depender solo
// del contraste del texto (esto es lo que fallaba antes: una caption sola, muy tenue,
// leía como "flotando" en vez de como el inicio de un grupo nuevo).
type NavLabel = { kind: 'label'; label: string; divider?: boolean }
type NavEntry = NavItem | NavLabel
type NavGroup = { key: string; label: string; items: NavEntry[] }

const DASHBOARD_ITEM: NavItem = { href: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> }

function isNavItem(entry: NavEntry): entry is NavItem {
  return 'href' in entry
}

// Agrupación por acordeones — misma jerarquía de secciones que app.html (legacy,
// ver `.sb-section` líneas 1420-1443: Principal / Meta Ads / Ventas y Operaciones /
// Control de Contenido / Inteligencia), adaptada a los módulos ya migrados a
// web-app/. Rutas sin página propia todavía quedan como placeholder (`PlaceholderPage`).
// "Biblioteca de Guiones" vive dentro de Meta Ads (no de Contenido): son los
// guiones de anuncios, atados a las métricas de esas campañas — misma ruta
// /scripts, solo cambia desde qué grupo del sidebar se accede a ella.
//
// Hub de Integraciones (2026-08-05): antes Ajustes tenía un clúster aparte
// con un link por plataforma conectada (Meta Ads, Tienda Nube) y Contenido
// tenía su propio "Conexiones" para Instagram/TikTok — 3 entradas sueltas
// en 2 grupos distintos para el mismo concepto. Ahora es un solo ítem
// ("Integraciones", /settings/integrations) que abre un hub tipo
// Zapier/Make con una tarjeta por plataforma (Meta Ads, Instagram, TikTok,
// Tienda Nube, Shopify, Google Analytics) — agregar una integración nueva
// ya no significa agregar un ítem nuevo al sidebar.
const GROUPS: NavGroup[] = [
  {
    key: 'meta-ads',
    label: 'Meta Ads',
    items: [
      { href: '/meta-ads/campaigns', label: 'Campañas', icon: <MetaCampaignsIcon /> },
      { href: '/meta-ads/profitability', label: 'Rentabilidad', icon: <ProfitabilityIcon /> },
      { href: '/meta-ads/snapshots', label: 'Snapshots', icon: <MetaSnapshotsIcon /> },
      { href: '/meta-ads/history', label: 'Historial', icon: <MetaHistoryIcon /> },
      { href: '/meta-ads/library', label: 'Biblioteca Ads', icon: <MetaLibraryIcon /> },
      { href: '/scripts', label: 'Biblioteca de Guiones', icon: <ContentScriptsIcon /> },
      { href: '/meta-ads/metrics', label: 'Tablas de Métricas', icon: <MetaMetricsIcon /> },
    ],
  },
  {
    key: 'contenido',
    label: 'Contenido',
    items: [
      { href: '/content', label: 'Calendario / Control', icon: <ContentControlIcon /> },
      { href: '/campaigns', label: 'Campañas', icon: <ContentCampaignsIcon /> },
      { href: '/notes', label: 'Notas', icon: <ContentNotesIcon /> },
    ],
  },
  {
    key: 'operaciones',
    label: 'Operaciones',
    items: [{ href: '/operations/sales', label: 'Ventas', icon: <SalesIcon /> }],
  },
  {
    key: 'inteligencia',
    label: 'Inteligencia',
    items: [
      { href: '/intelligence/brand-journal', label: 'Diario de Marca', icon: <BrandJournalIcon /> },
      { href: '/intelligence/autopilot', label: 'Autopiloto', icon: <AutopilotIcon /> },
      { href: '/intelligence/strategy', label: 'IA Estratégica', icon: <StrategyIcon /> },
    ],
  },
  {
    key: 'ajustes',
    label: 'Ajustes',
    items: [
      { href: '/settings', label: 'Perfil de negocio', icon: <SettingsProfileIcon /> },
      { href: '/team', label: 'Equipo', icon: <TeamIcon /> },
      { href: '/settings/billing', label: 'Facturación', icon: <BillingIcon /> },
      { href: '/settings/integrations', label: 'Integraciones', icon: <IntegrationsIcon /> },
    ],
  },
]

function isItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function groupHasActiveItem(group: NavGroup, pathname: string) {
  return group.items.some((entry) => isNavItem(entry) && isItemActive(pathname, entry.href))
}

function NavLink({
  item,
  active,
  collapsed,
  indented,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  indented?: boolean
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`group mx-2 my-0.5 flex items-center gap-2.5 rounded-md py-2.5 text-[13px] font-medium outline-none transition-colors duration-200 ease-out focus-visible:bg-white/[0.06] focus-visible:text-white focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/50 ${
        collapsed ? 'justify-center px-0' : indented ? 'pl-7 pr-3' : 'px-3'
      } ${
        active
          ? 'bg-accent/[0.16] font-semibold text-white shadow-[0_2px_14px_-3px_var(--primary-glow)]'
          : 'text-[#A8ADBB] hover:bg-white/[0.06] hover:text-white'
      }`}
    >
      <span
        className={`flex shrink-0 items-center justify-center transition-opacity duration-200 ease-out ${
          active ? 'opacity-100 text-accent' : 'opacity-70 group-hover:opacity-100'
        }`}
      >
        {item.icon}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

export function SidebarNav({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const pathname = usePathname()

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const group of GROUPS) {
      initial[group.key] = groupHasActiveItem(group, pathname)
    }
    return initial
  })

  // Si la navegación (Link, back/forward) aterriza en un grupo cerrado, lo abre
  // automáticamente sin tocar el estado de los demás grupos. Se ajusta durante el
  // render (patrón "adjusting state when a prop changes" de React) en vez de un
  // Effect, para evitar el render en cascada de un setState síncrono en efecto.
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setOpenGroups((prev) => {
      let changed = false
      const next = { ...prev }
      for (const group of GROUPS) {
        if (groupHasActiveItem(group, pathname) && !next[group.key]) {
          next[group.key] = true
          changed = true
        }
      }
      return changed ? next : prev
    })
  }

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[0.06] bg-[#14161D] shadow-[4px_0_32px_rgba(0,0,0,0.25)] transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[64px]' : 'w-[228px]'
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden border-b border-white/[0.08] px-5 py-[18px]">
        <span className="shrink-0 text-[20px] font-extrabold tracking-[-0.04em] text-accent">G</span>
        {!collapsed && <span className="text-[15px] font-extrabold tracking-[-0.04em] text-white">otix</span>}
      </div>

      <nav className="flex-1 overflow-y-auto px-0 py-3">
        <TrialBanner collapsed={collapsed} />

        <div className="mb-3">
          <NavLink item={DASHBOARD_ITEM} active={isItemActive(pathname, DASHBOARD_ITEM.href)} collapsed={collapsed} />
          <Link
            href="/guia-rapida"
            title={collapsed ? 'Guía rápida' : undefined}
            className={`mx-2 my-0.5 flex items-center rounded-md py-2 text-[12px] font-medium text-white/45 outline-none transition-colors duration-200 ease-out hover:bg-white/[0.04] hover:text-white/80 focus-visible:bg-white/[0.06] focus-visible:text-white focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/50 ${
              collapsed ? 'justify-center px-0' : 'px-3'
            } ${isItemActive(pathname, '/guia-rapida') ? 'text-white/80' : ''}`}
          >
            {collapsed ? 'GR' : 'Guía rápida'}
          </Link>
        </div>

        {GROUPS.map((group, groupIndex) => {
          const open = !!openGroups[group.key]
          const hasActive = groupHasActiveItem(group, pathname)

          if (collapsed) {
            return (
              <div key={group.key} className={groupIndex > 0 ? 'mt-3' : ''}>
                {group.items.filter(isNavItem).map((item) => (
                  <NavLink key={item.href} item={item} active={isItemActive(pathname, item.href)} collapsed />
                ))}
              </div>
            )
          }

          return (
            <div key={group.key} className={groupIndex > 0 ? 'mt-3' : ''}>
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={open}
                className={`mx-2 flex w-[calc(100%-16px)] items-center justify-between gap-2 rounded-md px-3 py-2 text-left outline-none transition-colors duration-200 ease-out hover:bg-white/[0.04] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/50 ${
                  hasActive ? 'text-white/75' : 'text-white/45 hover:text-white/70'
                }`}
              >
                <span className="text-[11px] font-extrabold uppercase tracking-[.09em]">{group.label}</span>
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`shrink-0 transition-transform duration-200 ease-out ${open ? 'rotate-90' : ''}`}
                >
                  <path d="M3.5 2.5l4 2.5-4 2.5" />
                </svg>
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  {group.items.map((entry) =>
                    isNavItem(entry) ? (
                      <NavLink
                        key={entry.href}
                        item={entry}
                        active={isItemActive(pathname, entry.href)}
                        collapsed={false}
                        indented
                      />
                    ) : (
                      <div key={`label-${entry.label}`} className="mt-1.5 pt-2">
                        {entry.divider && <div className="mx-3 mb-2 border-t border-white/[0.07]" />}
                        <p className="pb-1 pl-7 pr-3 text-[10px] font-bold uppercase tracking-[.08em] text-white/40">
                          {entry.label}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-white/[0.08] px-2 pt-2">
        <ThemeToggle collapsed={collapsed} />
        <CurrencyToggle collapsed={collapsed} />
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        className="flex items-center justify-center gap-2 px-4 py-3 text-white/50 outline-none transition-colors duration-200 ease-out hover:bg-white/[0.05] hover:text-white focus-visible:bg-white/[0.05] focus-visible:text-white focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/50"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition-transform duration-200 ease-out ${collapsed ? 'rotate-180' : ''}`}
        >
          <path d="M9 2L4 7l5 5" />
        </svg>
        {!collapsed && <span className="text-xs font-medium">Colapsar</span>}
      </button>
    </aside>
  )
}
