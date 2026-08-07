'use client'

import { scaleCampaignBudgetAction } from './actions'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import { useCurrency } from '@/lib/context/currency-context'
import { formatMoney } from '@/lib/currency'

const SCALE_UP_FACTOR = 1.2

// "Escalabilidad a un Clic" (2026-08-07) — solo aparece cuando el semáforo
// estratégico de la fila (getStrategicStatus, mismo criterio que
// StrategicStatusDot) ya dice 'escalar' — nunca se ofrece este botón como
// opción genérica, es una acción atada a una señal real. El monto nuevo se
// calcula y se muestra ANTES de confirmar (nunca "confirmás sí/no" a ciegas
// sobre plata real).
export function ScaleCampaignButton({
  campaignId,
  dailyBudget,
  lifetimeBudget,
  returnTo,
}: {
  campaignId: string
  dailyBudget: number | null
  lifetimeBudget: number | null
  returnTo: string
}) {
  const { accountCurrency } = useCurrency()
  const budgetType: 'daily' | 'lifetime' = lifetimeBudget != null && dailyBudget == null ? 'lifetime' : 'daily'
  const currentAmount = dailyBudget ?? lifetimeBudget
  if (currentAmount == null) return null

  const newAmount = Math.round(currentAmount * SCALE_UP_FACTOR)

  return (
    <form action={scaleCampaignBudgetAction} onClick={(e) => e.stopPropagation()}>
      <input type="hidden" name="campaign_id" value={campaignId} />
      <input type="hidden" name="budget_type" value={budgetType} />
      <input type="hidden" name="current_amount" value={currentAmount} />
      <input type="hidden" name="return_to" value={returnTo} />
      <ConfirmSubmitButton
        confirmMessage={`Esta campaña está cumpliendo tu objetivo de rentabilidad — ¿subir su presupuesto de ${formatMoney(currentAmount, accountCurrency, 0)} a ${formatMoney(newAmount, accountCurrency, 0)} (+20%)?`}
        variant="accent"
        toastPending="Escalando presupuesto…"
        toastSuccess="Presupuesto escalado con éxito"
        pillExtra="!py-0.5 !text-[10px] font-bold"
      >
        Escalar +20%
      </ConfirmSubmitButton>
    </form>
  )
}
