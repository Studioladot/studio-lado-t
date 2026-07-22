import { redirect } from 'next/navigation'
import Image from 'next/image'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
  // getDashboardContext ya redirige a /login si no hay sesión. Si el
  // usuario ya pertenece a alguna organización, no tiene sentido mostrarle
  // el onboarding de nuevo — lo mandamos directo al dashboard.
  const { organizations } = await getDashboardContext()

  if (organizations.length > 0) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-5">
      <div className="w-full max-w-[400px] rounded-card border border-border bg-surface px-10 py-11 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/logo-gotix.png" alt="Gotix" width={40} height={40} priority />
          <div>
            <h1 className="text-[22px] font-extrabold tracking-[-0.03em] text-text">
              ¿Cómo se llama tu marca o negocio?
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-text-2">
              Vamos a crear tu espacio en Gotix — podés cambiarle el nombre después.
            </p>
          </div>
        </div>
        <OnboardingForm />
      </div>
    </div>
  )
}
