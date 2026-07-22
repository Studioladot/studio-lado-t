'use client'

import { useOrganization } from '@/lib/context/organization-context'

export function OrganizationSwitcher() {
  const { organizations, activeOrganization, switchOrganization, isSwitching } = useOrganization()

  if (organizations.length === 0) {
    return null
  }

  return (
    <select
      value={activeOrganization?.id ?? ''}
      onChange={(e) => switchOrganization(e.target.value)}
      disabled={isSwitching}
      className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  )
}
