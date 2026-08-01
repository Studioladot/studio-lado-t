'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getLaunchWizardDataAction, type LaunchWizardData } from './data-actions'
import { TestCampaignWizard } from './test-campaign-wizard'

const MESSAGE: Partial<Record<LaunchWizardData['status'], { title: string; sub: string }>> = {
  no_org: { title: 'Todavía no pertenecés a ninguna organización', sub: '' },
  not_connected: { title: 'Todavía no conectaste Meta Ads', sub: 'Conectá tu cuenta publicitaria para poder lanzar un testeo.' },
  expired: { title: 'Tu conexión con Meta Ads venció', sub: 'Reconectá para poder lanzar un testeo.' },
  needs_reconnect: {
    title: 'Necesitás reconectar Meta Ads',
    sub: 'Para armar el anuncio necesitamos permiso para ver qué Página de Facebook administrás — tu conexión actual es de antes de que agregáramos esto.',
  },
}

export function LaunchTestCampaignModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<LaunchWizardData | null>(null)

  async function handleOpen() {
    setOpen(true)
    setLoading(true)
    const result = await getLaunchWizardDataAction()
    setData(result)
    setLoading(false)
  }

  function handleClose() {
    setOpen(false)
    setData(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-control bg-primary px-4 py-2 text-[13px] font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover hover:shadow-[0_0_28px_var(--primary-glow),0_0_8px_rgba(45,91,138,0.2)] active:scale-[0.98]"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M7 1.5v11M1.5 7h11" />
        </svg>
        Lanzar Testeo
      </button>

      {open && (
        <>
          {loading || !data ? (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex h-[300px] w-[420px] max-w-full flex-col items-center justify-center gap-3 rounded-card border border-border bg-surface p-8 text-center shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]"
              >
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-2 border-t-accent" />
                <p className="text-sm text-text-2">Preparando el wizard…</p>
              </div>
            </div>
          ) : data.status === 'ready' ? (
            <TestCampaignWizard
              pixels={data.pixels}
              pages={data.pages}
              audiences={data.audiences}
              existingPosts={data.existingPosts}
              existingCampaigns={data.existingCampaigns}
              scripts={data.scripts}
              libraryCreatives={data.libraryCreatives}
              onClose={handleClose}
            />
          ) : (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex w-[440px] max-w-full flex-col items-center gap-3 rounded-card border border-border bg-surface px-6 py-12 text-center shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]"
              >
                <p className="text-sm font-medium text-text">{MESSAGE[data.status]?.title ?? 'No pudimos abrir el wizard'}</p>
                {MESSAGE[data.status]?.sub && <p className="max-w-[320px] text-xs text-text-2">{MESSAGE[data.status]?.sub}</p>}
                {data.status !== 'no_org' && (
                  <Link
                    href="/settings/integrations"
                    className="mt-1 rounded-control bg-primary px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98]"
                  >
                    Ir a Conexiones
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-1 text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-text"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
