'use client'

import { useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { useToast } from './toast'

// Compartido por ConfirmSubmitButton y SubmitPillButton (pulido UX/UI,
// 2026-08-06) — un botón dentro de un <form action={...}> con un Server
// Action bindeado directo no tiene ningún punto intermedio del lado del
// cliente para engancharse salvo la transición de `pending` que ya expone
// useFormStatus: true→false es la única señal de "terminó" disponible acá.
export function useFormStatusToast(toastPending?: string, toastSuccess?: string) {
  const { pending } = useFormStatus()
  const toast = useToast()
  const wasPending = useRef(false)
  const toastIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (pending && !wasPending.current) {
      if (toastPending) toastIdRef.current = toast.show(toastPending, 'pending')
    } else if (!pending && wasPending.current) {
      if (toastIdRef.current !== null) {
        // Sin toastSuccess, solo se descarta en silencio — dejarlo "pending"
        // para siempre sería peor que no avisar nada.
        if (toastSuccess) toast.update(toastIdRef.current, toastSuccess, 'success')
        else toast.dismiss(toastIdRef.current)
        toastIdRef.current = null
      }
    }
    wasPending.current = pending
  }, [pending, toast, toastPending, toastSuccess])

  return pending
}
