'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type AuthState = {
  error: string | null
  info: string | null
}

export async function authAction(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get('email')
  const password = formData.get('password')
  const mode = formData.get('mode') === 'register' ? 'register' : 'login'

  if (typeof email !== 'string' || !email || typeof password !== 'string' || !password) {
    return { error: 'Completá tu email y contraseña.', info: null }
  }

  const supabase = await createClient()

  if (mode === 'register') {
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      return { error: 'No pudimos crear tu cuenta. Probá de nuevo.', info: null }
    }

    if (!data.session) {
      return { error: null, info: 'Registrado. Revisá tu email para confirmar la cuenta.' }
    }

    redirect('/dashboard')
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email o contraseña incorrectos.', info: null }
  }

  redirect('/dashboard')
}

async function getOrigin() {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
  const protocol = headerList.get('x-forwarded-proto') ?? 'http'
  return `${protocol}://${host}`
}

export async function signInWithGoogleAction() {
  const origin = await getOrigin()
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  })

  if (error || !data?.url) {
    redirect('/login?error=google')
  }

  redirect(data.url)
}
