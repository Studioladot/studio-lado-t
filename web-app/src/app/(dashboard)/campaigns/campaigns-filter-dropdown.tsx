'use client'

import Link from 'next/link'
import { DropdownMenu, FilterTrigger } from '@/components/features/dropdown-menu'

// Bug real encontrado (2026-08-06, rompía /campaigns en cada carga):
// campaigns/page.tsx es un Server Component — le pasaba `trigger` y
// `children` (funciones, render-props) directo a <DropdownMenu>, un
// componente 'use client'. React Server Components no puede serializar
// funciones cruzando el límite servidor→cliente ("Functions cannot be
// passed directly to Client Components..."), a diferencia de
// library-grid.tsx/history-list.tsx, que son 100% 'use client' y nunca
// cruzan ese límite. Este wrapper recibe solo `estado` (un string, dato
// serializable) y arma el DropdownMenu acá adentro, ya del lado del
// cliente — nada con forma de función sale nunca del Server Component.
const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'activa', label: 'Activas' },
  { value: 'apagada', label: 'Apagadas' },
] as const

export function CampaignsFilterDropdown({ estado }: { estado: string | undefined }) {
  const current = estado ?? 'all'

  return (
    <DropdownMenu
      trigger={({ open, toggle }) => (
        <FilterTrigger
          label="Estado"
          value={FILTERS.find((f) => f.value === current)?.label ?? 'Todas'}
          open={open}
          onClick={toggle}
          active={current !== 'all'}
        />
      )}
    >
      {(close) => (
        <>
          {FILTERS.map((opt) => (
            <Link
              key={opt.value}
              href={opt.value === 'all' ? '/campaigns' : `/campaigns?estado=${opt.value}`}
              onClick={close}
              className={`block w-full px-3.5 py-2 text-left text-xs transition-colors duration-150 ease-out hover:bg-surface-2 ${
                current === opt.value ? 'font-semibold text-accent' : 'text-text-2'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </>
      )}
    </DropdownMenu>
  )
}
