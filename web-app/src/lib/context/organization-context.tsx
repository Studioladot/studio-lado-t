'use client'

// Este contexto expone la organización activa del usuario logueado. Más adelante,
// cuando se implemente el filtrado global, cada hook o wrapper de queries a
// Supabase deberá leer `activeOrganization.id` desde acá y aplicarlo como
// `.eq('organization_id', activeOrganization.id)` en cada consulta a las tablas
// de negocio (content_posts, finances, meta_connections, etc.), en vez de
// depender únicamente de RLS para el filtrado. Esta fase solo deja la
// arquitectura del contexto lista — ese filtrado automático todavía no está
// implementado.

import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react'
import type { Database } from '@/lib/types/database.types'

export type Organization = Database['public']['Tables']['organizations']['Row'] & {
  role: string
}

interface OrganizationContextValue {
  organizations: Organization[]
  activeOrganization: Organization | null
  switchOrganization: (orgId: string) => void
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

export function OrganizationProvider({
  initialOrganizations,
  children,
}: {
  initialOrganizations: Organization[]
  children: ReactNode
}) {
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
    initialOrganizations[0]?.id ?? null
  )

  const activeOrganization = useMemo(
    () => initialOrganizations.find((org) => org.id === activeOrganizationId) ?? null,
    [initialOrganizations, activeOrganizationId]
  )

  const switchOrganization = useCallback(
    (orgId: string) => {
      if (initialOrganizations.some((org) => org.id === orgId)) {
        setActiveOrganizationId(orgId)
      }
    },
    [initialOrganizations]
  )

  const value = useMemo(
    () => ({ organizations: initialOrganizations, activeOrganization, switchOrganization }),
    [initialOrganizations, activeOrganization, switchOrganization]
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
