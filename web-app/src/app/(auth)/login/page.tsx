import Image from 'next/image'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-5">
      <div className="w-full max-w-[400px] rounded-card border border-border bg-surface px-10 py-11 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/logo-gotix.png" alt="Gotix" width={40} height={40} priority />
          <span className="text-[26px] font-extrabold tracking-[-0.04em] text-primary">
            Gotix
          </span>
          <p className="-mt-2 text-[13px] tracking-[.08em] text-text-2">
            Sistema Operativo de Negocios
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
