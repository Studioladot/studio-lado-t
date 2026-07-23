'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

type NavItem = { href: string; label: string; icon: ReactNode }
type NavGroup = { label: string; items: NavItem[] }

// Íconos reales de app.html (mismo nav de Dashboard/Campaña de Contenido),
// no inventados — ver frontend-taste.md.
const GROUPS: NavGroup[] = [
  {
    label: 'General',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="1" y="1" width="7" height="7" rx="1.5" />
            <rect x="10" y="1" width="7" height="7" rx="1.5" />
            <rect x="1" y="10" width="7" height="7" rx="1.5" />
            <rect x="10" y="10" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Contenido',
    items: [
      {
        href: '/content',
        label: 'Contenido',
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="1" y="1" width="7" height="4" rx="1" />
            <rect x="10" y="1" width="7" height="4" rx="1" />
            <rect x="1" y="7" width="7" height="10" rx="1" />
            <rect x="10" y="7" width="7" height="10" rx="1" />
          </svg>
        ),
      },
      {
        href: '/campaigns',
        label: 'Campañas',
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="1" y="3" width="16" height="14" rx="2" />
            <path d="M1 8h16" />
            <path d="M6 1v4M12 1v4" />
            <circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
          </svg>
        ),
      },
      {
        href: '/notes',
        label: 'Notas',
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14l2-5.5L14.5 1l3 3L9 12.5z" />
            <path d="M4 14h4" />
            <path d="M10.5 3.5l3 3" />
          </svg>
        ),
      },
      {
        href: '/scripts',
        label: 'Guiones',
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="1" width="12" height="16" rx="2" />
            <path d="M6 6h6M6 9h6M6 12h4" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Organización',
    items: [
      {
        href: '/team',
        label: 'Equipo',
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6.5" cy="5" r="2.5" />
            <path d="M1.5 15.5c0-2.5 2-4.5 5-4.5s5 2 5 4.5" />
            <circle cx="13" cy="6" r="2" />
            <path d="M11 11.2c1.8.3 3.2 1.7 3.5 3.8" />
          </svg>
        ),
      },
      {
        href: '/settings',
        label: 'Perfil de negocio',
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="9" r="2.5" />
            <path d="M9 1v2M9 15v2M3 4.5l1.4 1.4M14 12.1l-1.4-1.4M3 13.5l1.4-1.4M14 5.9l-1.4 1.4" />
          </svg>
        ),
      },
    ],
  },
  // Grupo "Integraciones" (Meta Ads, Tienda Nube) se agrega acá el día que
  // tengan una página propia — hoy solo viven como widgets en /dashboard.
]

export function SidebarNav({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const pathname = usePathname()

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[0.06] bg-[#14161D] transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[64px]' : 'w-[220px]'
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden border-b border-white/[0.08] px-5 py-[18px]">
        <span className="shrink-0 text-[20px] font-extrabold tracking-[-0.04em] text-accent">G</span>
        {!collapsed && <span className="text-[15px] font-extrabold tracking-[-0.04em] text-white">otix</span>}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {GROUPS.map((group) => (
          <div key={group.label} className="mt-2 first:mt-0">
            {!collapsed && (
              <p className="px-[18px] pb-1 pt-3 text-[10px] font-bold uppercase tracking-[.1em] text-white/30">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`group mx-2 my-0.5 flex items-center gap-2.5 rounded-md border-l-2 py-2 text-[13px] font-medium transition-all duration-200 ease-out ${
                    collapsed ? 'justify-center px-0' : 'px-4'
                  } ${
                    active
                      ? 'border-accent bg-accent/20 font-semibold text-white'
                      : 'border-transparent text-white/65 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span
                    className={`flex shrink-0 items-center justify-center transition-opacity duration-200 ease-out ${
                      active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        className="flex items-center justify-center gap-2 border-t border-white/[0.08] px-4 py-3 text-white/50 transition-colors duration-200 ease-out hover:bg-white/5 hover:text-white"
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
