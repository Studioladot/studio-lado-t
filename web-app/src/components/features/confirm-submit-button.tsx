'use client'

import { useFormStatusToast } from './use-form-status-toast'
import { pillClass, MiniSpinner, type PillVariant } from './action-pill'

// Pulido UX/UI (2026-08-06): spinner + cursor 'wait' + toast de feedback
// agregados acá una sola vez — todo botón de Borrar del proyecto que use
// este componente los gana gratis.
export function ConfirmSubmitButton({
  confirmMessage,
  children,
  pendingLabel,
  variant = 'danger',
  toastPending,
  toastSuccess,
  className,
  pillExtra,
}: {
  confirmMessage: string
  children: React.ReactNode
  pendingLabel?: string
  variant?: PillVariant
  toastPending?: string
  toastSuccess?: string
  /** Modo legacy: si se pasa, se usa tal cual (compat con call sites fuera de este pulido). Sin esto, se arma como pastilla con `variant`. */
  className?: string
  /** Clases extra encima de la pastilla — solo tiene efecto cuando `className` no está seteado. */
  pillExtra?: string
}) {
  const pending = useFormStatusToast(toastPending, toastSuccess)

  return (
    <button
      type="submit"
      disabled={pending}
      className={className ?? pillClass(variant, pillExtra)}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault()
        }
      }}
    >
      {pending && <MiniSpinner />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  )
}
