'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

// Sistema de notificaciones tipo Toast (pulido UX/UI, 2026-08-06) — sin
// librería externa (mismo criterio "cero dependencias" ya usado en el
// resto del proyecto). `show` crea un toast nuevo; `update` reescribe uno
// existente en el mismo lugar (así "Borrando…" se convierte en "Eliminado
// con éxito" sin apilar dos avisos para la misma acción). Los toasts
// 'pending' no se auto-descartan solos — quedan hasta que el caller los
// actualice a 'success'/'error', para nunca mostrar una confirmación falsa
// si la acción todavía sigue en curso.

type ToastKind = 'pending' | 'success' | 'error'
type ToastItem = { id: number; message: string; kind: ToastKind }

type ToastContextValue = {
  show: (message: string, kind?: ToastKind) => number
  update: (id: number, message: string, kind?: ToastKind) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const AUTO_DISMISS_MS = 2800

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="12" height="12" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

const KIND_ICON: Record<Exclude<ToastKind, 'pending'>, React.ReactNode> = {
  success: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
}

const KIND_CLASS: Record<ToastKind, string> = {
  pending: 'bg-surface-2 text-text border-border-2',
  success: 'bg-surface text-text border-green/40',
  error: 'bg-surface text-text border-red/40',
}

const KIND_ICON_CLASS: Record<ToastKind, string> = {
  pending: 'text-text-3',
  success: 'text-green',
  error: 'text-red',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const scheduleAutoDismiss = useCallback(
    (id: number) => {
      const existing = timers.current.get(id)
      if (existing) clearTimeout(existing)
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      )
    },
    [dismiss]
  )

  const show = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = ++idRef.current
      setToasts((items) => [...items, { id, message, kind }])
      if (kind !== 'pending') scheduleAutoDismiss(id)
      return id
    },
    [scheduleAutoDismiss]
  )

  const update = useCallback(
    (id: number, message: string, kind: ToastKind = 'success') => {
      setToasts((items) => {
        if (!items.some((t) => t.id === id)) return [...items, { id, message, kind }]
        return items.map((t) => (t.id === id ? { ...t, message, kind } : t))
      })
      if (kind !== 'pending') scheduleAutoDismiss(id)
    },
    [scheduleAutoDismiss]
  )

  return (
    <ToastContext.Provider value={{ show, update, dismiss }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[200] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all duration-200 ease-out ${KIND_CLASS[t.kind]}`}
          >
            <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center ${KIND_ICON_CLASS[t.kind]}`}>
              {t.kind === 'pending' ? <Spinner /> : KIND_ICON[t.kind]}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
