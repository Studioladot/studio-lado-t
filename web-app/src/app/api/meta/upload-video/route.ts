import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { uploadMetaAdVideo, waitForMetaVideoReady } from '@/lib/meta/ad-launch'

// Subida de video separada del submit final del wizard: arranca apenas el
// usuario elige el archivo (ver ad-editor.tsx), así el progreso que ve es el
// de la subida real desde su navegador hacia nuestro servidor (vía XHR
// upload.onprogress) — el tramo servidor→Meta y el procesamiento de Meta no
// tienen progreso incremental real, así que el cliente los muestra como un
// estado indeterminado ("Procesando en Meta...") mientras espera esta respuesta.
export async function POST(request: Request) {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) {
    return NextResponse.json({ ok: false, error: 'No encontramos tu organización activa.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: connection } = await supabase
    .from('meta_connections')
    .select('token, account_id, expires_at')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  if (!connection || (connection.expires_at && new Date(connection.expires_at) < new Date())) {
    return NextResponse.json({ ok: false, error: 'Meta Ads no está conectado.' }, { status: 400 })
  }

  const formData = await request.formData()
  const video = formData.get('video')
  if (!(video instanceof File) || video.size === 0) {
    return NextResponse.json({ ok: false, error: 'Falta el archivo de video.' }, { status: 400 })
  }

  const buffer = Buffer.from(await video.arrayBuffer())
  const uploadResult = await uploadMetaAdVideo(connection.token, connection.account_id, buffer, video.name)
  if (!uploadResult.ok) {
    return NextResponse.json({ ok: false, error: uploadResult.error }, { status: 502 })
  }

  const readyResult = await waitForMetaVideoReady(connection.token, uploadResult.videoId)
  if (!readyResult.ok) {
    return NextResponse.json({ ok: false, error: readyResult.error }, { status: 502 })
  }

  return NextResponse.json({ ok: true, videoId: uploadResult.videoId, thumbnailUrl: readyResult.thumbnailUrl })
}
