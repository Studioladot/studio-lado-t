'use client'

import { toggleCampaignStatusAction } from './actions'
import { Switch } from './switch'

// Mismo umbral que META_HIGH_SPEND_CONFIRM en app.html:10601 — pausar algo
// que ya gastó plata real pide confirmación, reactivar o pausar algo barato no.
const HIGH_SPEND_CONFIRM_USD = 30

export function CampaignStatusToggle({
  campaignId,
  campaignName,
  effectiveStatus,
  spend,
  returnTo,
}: {
  campaignId: string
  campaignName: string
  effectiveStatus: string
  spend: number
  returnTo: string
}) {
  const isActive = effectiveStatus === 'ACTIVE'
  const requiresConfirm = isActive && spend >= HIGH_SPEND_CONFIRM_USD

  return (
    <form
      action={toggleCampaignStatusAction}
      className="inline-flex items-center"
      onClick={(event) => event.stopPropagation()}
    >
      <input type="hidden" name="campaign_id" value={campaignId} />
      <input type="hidden" name="next_status" value={isActive ? 'PAUSED' : 'ACTIVE'} />
      <input type="hidden" name="return_to" value={returnTo} />
      <Switch
        type="submit"
        on={isActive}
        ariaLabel={isActive ? `Pausar ${campaignName}` : `Activar ${campaignName}`}
        onClick={(event) => {
          if (requiresConfirm) {
            const confirmed = window.confirm(
              `"${campaignName}" acumula $${spend.toFixed(0)} de gasto en el período seleccionado. ¿Confirmás pausarla?`
            )
            if (!confirmed) event.preventDefault()
          }
        }}
      />
    </form>
  )
}
