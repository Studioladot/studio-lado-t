import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

// Cliente con la Service Role Key — bypassea RLS por completo. Server-only,
// nunca importar desde un archivo 'use client'. Reservado para casos sin
// policy de insert/update para authenticated a propósito: el webhook de
// Data Deletion de Meta y la página pública de estado de esa solicitud (sin
// sesión de usuario detrás, ver migración 20260730180000), y el sync
// "instantáneo" de instagram_account_insights desde syncInstagramAccountInsightsAction
// (con sesión de usuario, pero esa tabla solo admite escritura desde
// service_role — ver migración 20260730150000; el organization_id ya se
// verifica vía getDashboardContext antes de usar este cliente, mismo
// aislamiento que daría RLS). Cualquier uso nuevo tiene que scopear a mano
// el organization_id correcto — este cliente no lo hace por vos.
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
