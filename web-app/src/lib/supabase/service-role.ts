import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

// Cliente con la Service Role Key — bypassea RLS por completo. Server-only,
// nunca importar desde un archivo 'use client'. Reservado para los dos
// únicos casos que no tienen una sesión de usuario detrás: el webhook de
// Data Deletion de Meta (lo llama Meta server-to-server, sin cookie de
// Gotix) y la página pública de estado de esa solicitud — ambos leen/
// escriben data_deletion_requests, que no tiene ninguna policy de RLS a
// propósito (ver migración 20260730180000_instagram_backend_infra.sql).
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
