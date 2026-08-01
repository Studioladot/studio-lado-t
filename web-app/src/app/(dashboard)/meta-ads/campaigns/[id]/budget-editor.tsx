'use client'

import { useState } from 'react'
import { updateCampaignBudgetAction } from '../actions'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'

export function BudgetEditor({
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
  const budgetType: 'daily' | 'lifetime' | null = dailyBudget != null ? 'daily' : lifetimeBudget != null ? 'lifetime' : null
  const currentValue = dailyBudget ?? lifetimeBudget

  if (budgetType === null) {
    return (
      <p className="text-xs text-text-3">
        El presupuesto de esta campaña se gestiona a nivel de conjunto de anuncios, no acá.
      </p>
    )
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-medium text-text">
          USD {currentValue?.toFixed(0)} {budgetType === 'daily' ? '/ día' : 'total'}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-accent transition-colors duration-200 ease-out hover:text-primary-hover"
        >
          Editar
        </button>
      </div>
    )
  }

  return (
    <form action={updateCampaignBudgetAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="campaign_id" value={campaignId} />
      <input type="hidden" name="budget_type" value={budgetType} />
      <input type="hidden" name="return_to" value={returnTo} />
      <span className="text-xs text-text-3">USD</span>
      <input
        type="number"
        name="amount"
        min={1}
        step={1}
        required
        defaultValue={currentValue ?? undefined}
        className="w-24 rounded-control border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent"
      />
      <span className="text-xs text-text-3">{budgetType === 'daily' ? '/ día' : 'total'}</span>
      <ConfirmSubmitButton
        confirmMessage="¿Cambiar el presupuesto de esta campaña? Afecta el gasto real en Meta Ads."
        className="rounded-control bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_12px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
      >
        Guardar
      </ConfirmSubmitButton>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-text"
      >
        Cancelar
      </button>
    </form>
  )
}
