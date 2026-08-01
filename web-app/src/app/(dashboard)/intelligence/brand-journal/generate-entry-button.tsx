'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateBrandJournalEntryAction } from './actions'

export function GenerateEntryButton({ hasEntryThisMonth }: { hasEntryThisMonth: boolean }) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    const result = await generateBrandJournalEntryAction()
    setGenerating(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={generating}
        onClick={handleGenerate}
        className="rounded-control bg-primary px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {generating ? 'Generando…' : hasEntryThisMonth ? 'Regenerar resumen del mes' : 'Generar resumen de este mes'}
      </button>
      {error && <p className="text-[11px] text-red">{error}</p>}
    </div>
  )
}
