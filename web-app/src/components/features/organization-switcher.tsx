'use client'

import { useOrganization } from '@/lib/context/organization-context'

export function OrganizationSwitcher() {
  const { organizations, activeOrganization, switchOrganization } = useOrganization()

  if (organizations.length === 0) {
    return null
  }

  return (
    <select
      value={activeOrganization?.id ?? ''}
      onChange={(e) => switchOrganization(e.target.value)}
      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
    >
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  )
}
