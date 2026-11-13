import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppLogo } from '@/components/features/app-logo'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ nueva?: string }> }) {
  // ?nueva=1 — el administrador agrega otra cuenta (otra marca/cliente) desde
  // el selector de cuentas. Sin eso, quien ya tiene cuentas va al panel.
  const isAdding = (await searchParams).nueva === '1'
  // getDashboardContext ya redirige a /login si no hay sesión. Si el
  // usuario ya pertenece a alguna organización, no tiene sentido mostrarle
  // el onboarding de nuevo — lo mandamos directo al dashboard.
  const { organizations } = await getDashboardContext()

  if (organizations.length > 0 && !isAdding) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-5">
      <div className="w-full max-w-[400px] rounded-card border border-border bg-surface px-10 py-11 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <AppLogo width={220} priority />
          <div>
            <h1 className="text-[22px] font-extrabold tracking-[-0.03em] text-text">
              {isAdding ? 'Agregar una cuenta' : '¿Cómo se llama tu marca o negocio?'}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-text-2">
              {isAdding
                ? 'Escribí el nombre de la marca o cliente. Después conectás su Tienda Nube y Meta desde Integraciones.'
                : 'Vamos a crear tu espacio en GOTIX x LADO T — podés cambiarle el nombre después.'}
            </p>
          </div>
        </div>
        <OnboardingForm />
        {isAdding && organizations.length > 0 && (
          <Link
            href="/dashboard"
            className="mt-4 block text-center text-xs font-semibold text-text-3 transition-colors duration-200 ease-out hover:text-text"
          >
            Volver sin crear
          </Link>
        )}
      </div>
    </div>
  )
}
