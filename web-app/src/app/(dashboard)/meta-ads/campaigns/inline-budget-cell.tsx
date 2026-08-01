'use client'

import { useState } from 'react'
import { updateCampaignBudgetAction } from './actions'
import { formatBudget } from './status'
import { useCurrency } from '@/lib/context/currency-context'
import { convertAmount } from '@/lib/currency'

// Control inline total (pedido explícito: click sobre el presupuesto, se
// escribe el valor nuevo, Enter guarda) — sin popups ni confirm(), a
// diferencia de BudgetEditor (detalle de campaña), que sí confirma porque
// vive fuera de una tabla densa. Reutiliza la misma updateCampaignBudgetAction.
//
// La VISTA respeta el switch global de moneda (se convierte solo para
// mostrar). La EDICIÓN se queda siempre en la moneda nativa de la cuenta,
// a propósito — convertir un presupuesto real antes de mandarlo a la API de
// Meta es plata de verdad en juego, no vale la pena el riesgo de una
// conversión silenciosa mal hecha. Un label chico aclara en qué moneda se
// está escribiendo para que no haya ambigüedad.
export function InlineBudgetCell({
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
  const [editing, setEditing] = useState(false)
  const { displayCurrency, accountCurrency, usdArsRate } = useCurrency()
  const budgetType: 'daily' | 'lifetime' = lifetimeBudget != null && dailyBudget == null ? 'lifetime' : 'daily'
  const currentValue = dailyBudget ?? lifetimeBudget

  if (currentValue == null) {
    return <span className="text-sm font-semibold text-text-2">{formatBudget(dailyBudget, lifetimeBudget, displayCurrency)}</span>
  }

  if (!editing) {
    const displayDaily = dailyBudget !== null ? convertAmount(dailyBudget, accountCurrency, displayCurrency, usdArsRate) : null
    const displayLifetime = lifetimeBudget !== null ? convertAmount(lifetimeBudget, accountCurrency, displayCurrency, usdArsRate) : null
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Click para editar"
        className="rounded px-1.5 py-0.5 text-sm font-semibold text-text-2 outline-none transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-text focus-visible:ring-2 focus-visible:ring-accent"
      >
        {formatBudget(displayDaily, displayLifetime, displayCurrency)}
      </button>
    )
  }

  return (
    <form
      action={updateCampaignBudgetAction}
      className="inline-flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <input type="hidden" name="campaign_id" value={campaignId} />
      <input type="hidden" name="budget_type" value={budgetType} />
      <input type="hidden" name="return_to" value={returnTo} />
      <input
        type="number"
        name="amount"
        min={1}
        step={1}
        required
        autoFocus
        defaultValue={currentValue}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            setEditing(false)
          }
        }}
        onBlur={() => setEditing(false)}
        className="w-20 rounded-control border border-accent bg-surface px-2 py-1 text-center text-sm font-semibold text-text outline-none"
      />
      <span className="text-[10px] font-medium text-text-3">{accountCurrency}</span>
    </form>
  )
}
