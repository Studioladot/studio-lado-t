// Diagnóstico temporal (2026-08-06) — Next.js redacta el mensaje real de
// cualquier excepción de Server Component en producción, incluso dentro
// de un error.tsx propio (confirmado: el digest llegó, el mensaje no).
// Este helper NO es un error boundary — se usa con try/catch explícito
// adentro del propio Server Component, así lo que se renderiza es DATA
// elegida por nosotros, no una excepción no controlada, y Next no tiene
// nada que redactar. Se saca una vez identificada la causa real del
// crash de /campaigns.
export function DiagnosticErrorPanel({ error, context }: { error: unknown; context: string }) {
  const err = error instanceof Error ? error : null

  return (
    <div className="mx-auto max-w-[640px] py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-red">Error real capturado — {context}</p>
      <h1 className="mt-2 text-lg font-semibold text-text">Mandá una captura de este cuadro completo</h1>
      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-control border border-border bg-surface-2/60 p-4 text-left text-xs text-text-2">
        {err ? err.message : String(error)}
        {err?.stack ? `\n\n${err.stack}` : ''}
      </pre>
    </div>
  )
}
