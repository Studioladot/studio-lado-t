import { createServiceRoleClient } from '@/lib/supabase/service-role'

// Página pública que devuelve el `url` del Data Deletion Callback
// (src/app/api/meta/data-deletion/route.ts) — Meta se la muestra al usuario
// que pidió el borrado para que pueda verificar el estado. Sin sesión, sin
// datos sensibles expuestos (solo status + fecha, nunca el fb_user_id ni
// nada de las conexiones borradas).

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })
}

export default async function DataDeletionStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams
  const supabase = createServiceRoleClient()

  const { data: deletionRequest } = id
    ? await supabase.from('data_deletion_requests').select('status, requested_at, completed_at').eq('confirmation_code', id).maybeSingle()
    : { data: null }

  return (
    <div className="mx-auto flex min-h-screen max-w-[520px] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wide text-text-3">Gotix</p>
      <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-text">Solicitud de borrado de datos</h1>

      {!deletionRequest ? (
        <p className="mt-4 text-sm text-text-2">No encontramos ninguna solicitud con ese código.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3 rounded-card border border-border bg-surface px-6 py-5">
          <div className="flex items-center justify-center gap-2">
            <span className={`h-2 w-2 rounded-full ${deletionRequest.status === 'completed' ? 'bg-green' : 'bg-amber'}`} />
            <p className="text-sm font-bold text-text">{deletionRequest.status === 'completed' ? 'Completado' : 'En proceso'}</p>
          </div>
          <p className="text-xs text-text-2">Solicitado el {formatDate(deletionRequest.requested_at)}</p>
          {deletionRequest.completed_at && <p className="text-xs text-text-2">Completado el {formatDate(deletionRequest.completed_at)}</p>}
        </div>
      )}
    </div>
  )
}
