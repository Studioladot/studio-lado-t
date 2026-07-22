'use client'

// Este contexto expone la organización activa del usuario logueado. La
// organización activa persiste server-side en una cookie httpOnly (ver
// src/lib/organization/active-organization.ts) — el layout de (dashboard)
// la lee y valida en cada request, y switchOrganization() la actualiza vía
// Server Action (src/lib/organization/actions.ts) antes de refrescar la
// vista con router.refresh().
//
// Cada query nueva a una tabla de negocio (content_posts, finances,
// meta_connections, etc.) debe filtrar por `activeOrganization.id` — ese
// id ya está validado contra la membresía real del usuario, nunca confiar
// en un id de organización que venga de otro lado sin pasar por acá.

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useTransition,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import type { Database } from '@/lib/types/database.types'
import { setActiveOrganizationAction } from '@/lib/organization/actions'

export type Organization = Database['public']['Tables']['organizations']['Row'] & {
  role: string
}

interface OrganizationContextValue {
  organizations: Organization[]
  activeOrganization: Organization | null
  switchOrganization: (orgId: string) => void
  isSwitching: boolean
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

export function OrganizationProvider({
  initialOrganizations,
  initialActiveOrganizationId,
  children,
}: {
  initialOrganizations: Organization[]
  initialActiveOrganizationId: string | null
  children: ReactNode
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
    initialActiveOrganizationId ?? initialOrganizations[0]?.id ?? null
  )

  const activeOrganization = useMemo(
    () => initialOrganizations.find((org) => org.id === activeOrganizationId) ?? null,
    [initialOrganizations, activeOrganizationId]
  )

  const switchOrganization = useCallback(
    (orgId: string) => {
      if (orgId === activeOrganizationId || !initialOrganizations.some((org) => org.id === orgId)) {
        return
      }

      // Optimista: la UI cambia al instante; la cookie y el resto del árbol
      // server-rendered se ponen al día en la transición de abajo.
      setActiveOrganizationId(orgId)

      startTransition(async () => {
        await setActiveOrganizationAction(orgId)
        router.refresh()
      })
    },
    [initialOrganizations, activeOrganizationId, router]
  )

  const value = useMemo(
    () => ({
      organizations: initialOrganizations,
      activeOrganization,
      switchOrganization,
      isSwitching: isPending,
    }),
    [initialOrganizations, activeOrganization, switchOrganization, isPending]
  )

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization debe usarse dentro de un OrganizationProvider')
  }
  return context
}
