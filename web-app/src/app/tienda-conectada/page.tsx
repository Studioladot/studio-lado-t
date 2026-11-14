import { AppLogo } from '@/components/features/app-logo'

// Página pública donde termina el link de conexión de Tienda Nube (ver
// lib/tiendanube/oauth.ts y api/tiendanube/callback). Se abre sin sesión de
// Gotix (otro perfil de Chrome, incógnito o el dueño de la tienda), así que
// solo muestra el resultado y nada de la cuenta.

export default async function TiendaConectadaPage({
  searchParams,
}: {
  searchParams: Promise<{ tienda?: string; cuenta?: string; error?: string }>
}) {
  const { tienda, cuenta, error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-5">
      <div className="w-full max-w-[420px] rounded-card border border-border bg-surface px-10 py-11 text-center shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="mb-6 flex justify-center">
          <AppLogo width={200} priority />
        </div>
        {error ? (
          <>
            <h1 className="text-xl font-extrabold tracking-[-0.03em] text-text">No se pudo conectar</h1>
            <p className="mt-3 text-[13px] leading-relaxed text-red">{error}</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-green/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-green">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
            <h1 className="text-xl font-extrabold tracking-[-0.03em] text-text">Tienda conectada</h1>
            <p className="mt-3 text-[13px] leading-relaxed text-text-2">
              {tienda ?? 'Tu tienda'} quedó conectada{cuenta ? ` a la cuenta ${cuenta}` : ''} en GOTIX x LADO T. Ya podés cerrar esta pestaña.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
