import { NextResponse } from 'next/server'
import { uploadMetaAdVideoFromUrl } from '@/lib/meta/ad-launch'
import { getLaunchUploadContext } from '@/lib/meta/launch-upload'

// Subida de video (2026-11-15): el navegador ya subió el archivo directo al
// almacenamiento (ver new/upload-creative.ts) y acá solo llega la ruta. Meta
// lo descarga por link — antes el archivo pasaba por esta función y Vercel
// cortaba todo lo que superaba 4,5 MB. El procesamiento de Meta se sigue
// desde el navegador con /api/meta/video-status.
export async function POST(request: Request) {
  const ctx = await getLaunchUploadContext()
  if (!ctx.ok) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status })

  const body = (await request.json().catch(() => ({}))) as { path?: string; name?: string }
  const fileUrl = body.path ? ctx.publicUrl(body.path) : null
  if (!fileUrl) return NextResponse.json({ ok: false, error: 'Falta el archivo de video.' }, { status: 400 })

  const result = await uploadMetaAdVideoFromUrl(ctx.token, ctx.accountId, fileUrl, body.name || 'Video Gotix')
  if (!result.ok) {
    console.error('[upload-video] Meta rechazó el video:', result.error)
    return NextResponse.json({ ok: false, error: 'Meta no aceptó el video. Probá de nuevo o con otro archivo.' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, videoId: result.videoId })
}
