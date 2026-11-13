'use client'

import { useRouter } from 'next/navigation'
import { useOrganization } from '@/lib/context/organization-context'

const ADD_ACCOUNT = '__agregar__'

export function OrganizationSwitcher() {
  const { organizations, activeOrganization, switchOrganization, isSwitching } = useOrganization()
  const router = useRouter()

  if (organizations.length === 0) {
    return null
  }

  return (
    <select
      value={activeOrganization?.id ?? ''}
      onChange={(e) => {
        if (e.target.value === ADD_ACCOUNT) router.push('/onboarding?nueva=1')
        else switchOrganization(e.target.value)
      }}
      disabled={isSwitching}
      className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
      <option disabled>──────────</option>
      <option value={ADD_ACCOUNT}>Agregar cuenta…</option>
    </select>
  )
}
