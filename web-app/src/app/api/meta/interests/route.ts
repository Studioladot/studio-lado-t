import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { searchMetaInterests } from '@/lib/meta/ad-launch'

// Autocomplete de intereses reales de Meta para el selector de audiencia del
// wizard — el token nunca sale del servidor, el cliente solo manda el texto
// buscado (ver audience-selector.tsx).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = (searchParams.get('q') ?? '').trim()
  if (query.length < 2) {
    return NextResponse.json({ ok: true, interests: [] })
  }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) {
    return NextResponse.json({ ok: false, error: 'No encontramos tu organización activa.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: connection } = await supabase
    .from('meta_connections')
    .select('token, expires_at')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  if (!connection || (connection.expires_at && new Date(connection.expires_at) < new Date())) {
    return NextResponse.json({ ok: false, error: 'Meta Ads no está conectado.' }, { status: 400 })
  }

  const result = await searchMetaInterests(connection.token, query)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  }

  return NextResponse.json({ ok: true, interests: result.interests })
}
