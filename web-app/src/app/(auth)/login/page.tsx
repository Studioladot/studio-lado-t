import { AppLogo } from '@/components/features/app-logo'
import { LoginForm } from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { error } = await searchParams
  const sinAcceso = error === 'sin_acceso'

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-5">
      <div className="w-full max-w-[400px] rounded-card border border-border bg-surface px-10 py-11 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <AppLogo width={260} priority />
          <p className="mt-1 text-[12px] uppercase tracking-[.14em] text-text-3">
            Sistema Operativo de Negocios
          </p>
        </div>
        {sinAcceso && (
          <p role="alert" className="mb-5 rounded-control border border-border px-3 py-2.5 text-center text-xs text-red">
            Esta cuenta no tiene acceso a GOTIX x LADO T.
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  )
}
