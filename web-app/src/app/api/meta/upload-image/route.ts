import { NextResponse } from 'next/server'
import { uploadMetaAdImage } from '@/lib/meta/ad-launch'
import { getLaunchUploadContext } from '@/lib/meta/launch-upload'

// Imagen (2026-11-15): igual que el video, llega ya subida al almacenamiento.
// El servidor la descarga y se la pasa a Meta; el formulario final solo lleva
// el código de la imagen, así no pesa nada al lanzar.
export async function POST(request: Request) {
  const ctx = await getLaunchUploadContext()
  if (!ctx.ok) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status })

  const body = (await request.json().catch(() => ({}))) as { path?: string }
  const fileUrl = body.path ? ctx.publicUrl(body.path) : null
  if (!fileUrl) return NextResponse.json({ ok: false, error: 'Falta la imagen.' }, { status: 400 })

  const fileRes = await fetch(fileUrl)
  if (!fileRes.ok) return NextResponse.json({ ok: false, error: 'No pudimos leer la imagen. Probá de nuevo.' }, { status: 502 })
  const buffer = Buffer.from(await fileRes.arrayBuffer())

  const result = await uploadMetaAdImage(ctx.token, ctx.accountId, buffer.toString('base64'))
  if (!result.ok) {
    console.error('[upload-image] Meta rechazó la imagen:', result.error)
    return NextResponse.json({ ok: false, error: 'Meta no aceptó la imagen. Probá con otro archivo.' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, hash: result.hash })
}
