import Link from 'next/link'
import { CampaignForm } from './campaign-form'

export default function NewCampaignPage() {
  return (
    <div className="mx-auto max-w-[520px]">
      <Link
        href="/campaigns"
        className="mb-4 inline-block text-xs font-medium text-text-2 transition-colors duration-200 ease-out hover:text-text"
      >
        ← Volver a campañas
      </Link>
      <div className="rounded-card border border-border bg-surface px-8 py-9 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <h1 className="mb-1 text-lg font-extrabold tracking-[-0.02em] text-text">
          Nueva campaña de contenido
        </h1>
        <p className="mb-6 text-[13px] text-text-2">
          Empieza en planificación — podés activarla cuando esté lista.
        </p>
        <CampaignForm />
      </div>
    </div>
  )
}
