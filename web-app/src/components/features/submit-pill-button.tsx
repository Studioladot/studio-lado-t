'use client'

import { useFormStatusToast } from './use-form-status-toast'
import { pillClass, MiniSpinner, type PillVariant } from './action-pill'

// Pastilla de acción sin confirmación (pulido UX/UI, 2026-08-06) — mismo
// spinner+toast que ConfirmSubmitButton, para acciones no destructivas
// dentro de un <form action={...}> (ej. "Marcar publicado").
export function SubmitPillButton({
  children,
  pendingLabel,
  variant = 'neutral',
  toastPending,
  toastSuccess,
  pillExtra,
}: {
  children: React.ReactNode
  pendingLabel?: string
  variant?: PillVariant
  toastPending?: string
  toastSuccess?: string
  pillExtra?: string
}) {
  const pending = useFormStatusToast(toastPending, toastSuccess)

  return (
    <button type="submit" disabled={pending} className={pillClass(variant, pillExtra)}>
      {pending && <MiniSpinner />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  )
}
