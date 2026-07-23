'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/campaigns', label: 'Campañas' },
] as const

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`)

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-control px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ease-out ${
              active ? 'bg-primary/[8%] text-primary' : 'text-text-2 hover:bg-surface-2 hover:text-text'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
