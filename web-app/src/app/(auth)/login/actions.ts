'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type LoginState = {
  error: string | null
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || !email || typeof password !== 'string' || !password) {
    return { error: 'Completá tu email y contraseña.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email o contraseña incorrectos.' }
  }

  redirect('/dashboard')
}
