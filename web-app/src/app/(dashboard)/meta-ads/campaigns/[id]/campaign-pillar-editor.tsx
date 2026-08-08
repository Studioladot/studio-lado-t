'use client'

import { useState } from 'react'
import { saveCampaignPillarAction } from '../actions'
import { PillarField } from '@/components/features/pillar-field'
import { useToast } from '@/components/features/toast'
import type { ContentPillar } from '@/lib/pillars'

// "Pilares Estratégicos" en el detalle de una campaña (2026-08-07) — el
// mismo <select> del wizard, reusado acá para (re)asignar el pilar de una
// campaña ya creada. Guarda apenas cambia, sin botón de submit aparte —
// mismo criterio inmediato que InlineBudgetCell/BudgetEditor.
export function CampaignPillarEditor({
  campaignId,
  pillars,
  currentPillar,
}: {
  campaignId: string
  pillars: ContentPillar[]
  currentPillar: string | null
}) {
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  async function handleChange(e: React.ChangeEvent<HTMLDivElement>) {
    const value = (e.target as unknown as HTMLSelectElement).value
    if (!value) return
    setSaving(true)
    const result = await saveCampaignPillarAction(campaignId, value)
    setSaving(false)
    if (!result.ok) {
      toast.show(result.error, 'error')
      return
    }
    toast.show('Pilar actualizado', 'success')
  }

  return (
    <div onChange={handleChange} className={`transition-opacity duration-150 ease-out ${saving ? 'opacity-60' : ''}`}>
      <PillarField pillars={pillars} defaultValue={currentPillar ?? ''} />
    </div>
  )
}
