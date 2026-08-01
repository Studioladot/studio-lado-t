'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Switch } from './switch'

const ITEM_CLASS =
  'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-text-2 outline-none transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-text focus-visible:bg-surface-2 focus-visible:text-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-2'

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0 opacity-60">
      <path d="M14 8a6 6 0 1 1-1-3.2" />
      <path d="M14 2v3h-3" />
    </svg>
  )
}
function TargetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0 opacity-60">
      <circle cx="8" cy="8" r="6.5" />
      <circle cx="8" cy="8" r="3.5" />
      <circle cx="8" cy="8" r="1" />
    </svg>
  )
}
function SnapshotIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0 opacity-60">
      <rect x="2" y="4" width="12" height="9" rx="1.5" />
      <path d="M10 4l-1.5-2h-1L6 4" />
      <circle cx="8" cy="9" r="2" />
    </svg>
  )
}

export function CampaignsHeaderMenu({
  focusMode,
  onToggleFocusMode,
}: {
  focusMode: boolean
  onToggleFocusMode: () => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Más opciones"
        aria-expanded={open}
        className="flex h-[34px] w-[34px] items-center justify-center rounded-control border border-border bg-surface text-text-2 outline-none transition-all duration-200 ease-out hover:bg-surface-2 hover:text-text focus-visible:ring-2 focus-visible:ring-accent"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.3" />
          <circle cx="8" cy="8" r="1.3" />
          <circle cx="8" cy="13" r="1.3" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[228px] rounded-control border border-border-2 bg-surface p-1 shadow-[0_8px_32px_rgba(0,0,0,0.16)]">
          <button
            type="button"
            className={ITEM_CLASS}
            onClick={() => {
              router.refresh()
              setOpen(false)
            }}
          >
            <RefreshIcon />
            Actualizar
          </button>
          <button type="button" className={ITEM_CLASS} disabled title="Próximamente">
            <TargetIcon />
            Objetivos
          </button>
          <button type="button" className={ITEM_CLASS} disabled title="Próximamente — se habilita junto con Snapshots">
            <SnapshotIcon />
            Auto-snapshot
          </button>

          <div className="my-1 h-px bg-border" />

          <div
            className="flex w-full items-center justify-between gap-2.5 rounded-md px-3 py-2 opacity-40"
            title="Próximamente — depende de la integración de stock con Tienda Nube"
          >
            <span className="flex flex-col gap-0.5 text-left">
              <span className="text-[13px] font-medium text-text-2">Ciclo Vivo</span>
              <span className="text-[10px] text-text-3">Pausa anuncios si se agota el stock</span>
            </span>
            <Switch on={false} disabled ariaLabel="Ciclo Vivo — pausa automática" />
          </div>

          <div className="my-1 h-px bg-border" />

          <button
            type="button"
            onClick={() => {
              onToggleFocusMode()
              setOpen(false)
            }}
            className="flex w-full items-center justify-between gap-2.5 rounded-md px-3 py-2 text-left outline-none transition-colors duration-150 ease-out hover:bg-surface-2 focus-visible:bg-surface-2"
          >
            <span className="text-[13px] font-medium text-text-2">Modo Focus</span>
            <Switch on={focusMode} ariaLabel="Modo Focus" />
          </button>
        </div>
      )}
    </div>
  )
}
