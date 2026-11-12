'use client'

import { useState, useTransition } from 'react'
import { createClaudeAccessAction, revokeClaudeAccessAction } from './claude-actions'

// Conexión de Claude — a diferencia de las otras integraciones no es por
// cuenta sino por usuario: una sola dirección da acceso de solo lectura a
// todas las cuentas de Gotix de las que la persona es miembro.

type ActiveAccess = { createdAt: string; lastUsedAt: string | null; hint: string } | null

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ClaudeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />
    </svg>
  )
}

export function ClaudeConnectorPanel({ active, organizationNames }: { active: ActiveAccess; organizationNames: string[] }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  function generate() {
    if (active && !window.confirm('Se va a generar una dirección nueva y la anterior deja de funcionar. ¿Seguir?')) return
    setError(null)
    setCopied(false)
    startTransition(async () => {
      const result = await createClaudeAccessAction()
      if (result.ok) setUrl(result.url)
      else setError(result.error)
    })
  }

  function revoke() {
    if (!window.confirm('Claude va a dejar de poder leer tus cuentas de Gotix. ¿Revocar el acceso?')) return
    setUrl(null)
    startTransition(async () => {
      await revokeClaudeAccessAction()
    })
  }

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const connected = !!active || !!url

  return (
    <section className="mt-6 rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-2">
            <ClaudeIcon />
          </span>
          <div>
            <p className="text-sm font-semibold text-text">Claude</p>
            <p className="mt-0.5 max-w-[620px] text-xs leading-relaxed text-text-2">
              Le da a Claude acceso de solo lectura a tus cuentas de Gotix para que le puedas preguntar por ventas, ganancia, productos, stock
              y campañas de Meta, con los mismos números que ves acá. No puede cambiar ni borrar nada.
            </p>
            {organizationNames.length > 0 && (
              <p className="mt-1.5 text-xs text-text-3">Cuentas que va a poder leer: {organizationNames.join(', ')}.</p>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            connected ? 'bg-green/[0.12] text-green' : 'bg-surface-2 text-text-3'
          }`}
        >
          {connected ? 'Activa' : 'Sin conectar'}
        </span>
      </div>

      {url ? (
        <div className="mt-4 rounded-control border border-border bg-surface-2/50 p-4">
          <p className="text-xs font-semibold text-text">Tu dirección privada</p>
          <p className="mt-0.5 text-xs text-text-2">Copiala ahora: por seguridad no se vuelve a mostrar. Quien la tenga puede leer tus cuentas.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 truncate rounded-control border border-border-2 bg-surface px-3 py-2 font-mono text-[12px] text-text">
              {url}
            </code>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-control bg-primary px-4 py-2 text-xs font-bold text-white transition-colors duration-200 ease-out hover:bg-primary-hover"
            >
              {copied ? 'Copiada' : 'Copiar'}
            </button>
          </div>
          <ol className="mt-4 flex list-decimal flex-col gap-1 pl-4 text-xs leading-relaxed text-text-2">
            <li>En Claude, entrá a Configuración y después a Conectores.</li>
            <li>Elegí agregar un conector personalizado.</li>
            <li>Ponele de nombre GOTIX x LADO T, pegá la dirección y guardá.</li>
            <li>En un chat nuevo, activá el conector y preguntale, por ejemplo: &ldquo;Analizá las ventas de El Palacio de los últimos 30 días&rdquo;.</li>
          </ol>
        </div>
      ) : active ? (
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:max-w-[520px] sm:grid-cols-3">
          <div>
            <p className="font-bold uppercase tracking-wide text-text-3">Creada</p>
            <p className="mt-0.5 text-text">{formatDateTime(active.createdAt)}</p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-wide text-text-3">Último uso</p>
            <p className="mt-0.5 text-text">{active.lastUsedAt ? formatDateTime(active.lastUsedAt) : 'Todavía no se usó'}</p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-wide text-text-3">Termina en</p>
            <p className="mt-0.5 font-mono text-text">····{active.hint}</p>
          </div>
        </div>
      ) : null}

      {error && <p className="mt-3 text-xs text-red">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="rounded-control bg-primary px-4 py-2 text-xs font-bold text-white transition-colors duration-200 ease-out hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? 'Generando…' : connected ? 'Generar dirección nueva' : 'Conectar con Claude'}
        </button>
        {connected && (
          <button
            type="button"
            onClick={revoke}
            disabled={pending}
            className="text-xs font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red disabled:opacity-60"
          >
            Revocar acceso
          </button>
        )}
      </div>
    </section>
  )
}
