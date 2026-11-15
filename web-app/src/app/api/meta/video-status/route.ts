import { NextResponse } from 'next/server'
import { getMetaVideoStatus } from '@/lib/meta/ad-launch'
import { getLaunchUploadContext } from '@/lib/meta/launch-upload'

// El navegador consulta cada pocos segundos si Meta terminó de procesar el video.
export async function GET(request: Request) {
  const ctx = await getLaunchUploadContext()
  if (!ctx.ok) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status })

  const videoId = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^\d+$/.test(videoId)) return NextResponse.json({ ok: false, error: 'Video inválido.' }, { status: 400 })

  const result = await getMetaVideoStatus(ctx.token, videoId)
  if (!result.ok) {
    console.error('[video-status]', result.error)
    return NextResponse.json({ ok: false, error: 'No pudimos consultar el video en Meta.' }, { status: 502 })
  }
  return NextResponse.json(result)
}
