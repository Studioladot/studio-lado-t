'use client'

import { getLibraryUploadUrlAction } from '../../library/actions'

// Subida de creativos del Lanzador (2026-11-15).
// 1. El navegador sube el archivo DIRECTO al almacenamiento de Gotix (URL
//    firmada, con progreso real) — no pasa por una función del servidor, así
//    que no hay límite de 4,5 MB.
// 2. Video: Meta lo descarga por link y acá se sigue su procesamiento.
//    Imagen: el servidor la pasa a Meta y devuelve el código de imagen.
// Hasta MAX_PARALLEL subidas a la vez, para que 9 videos no compitan por la conexión.

const MAX_PARALLEL = 3
// Tope por archivo del almacenamiento de Gotix (plan actual de Supabase).
const MAX_FILE_MB = 50
let running = 0
const queue: Array<() => void> = []

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((resolve) => queue.push(resolve))
  running++
  try {
    return await fn()
  } finally {
    running--
    queue.shift()?.()
  }
}

function putToSignedUrl(path: string, token: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', `${base}/storage/v1/object/upload/sign/piezas-media/${path}?token=${encodeURIComponent(token)}`)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`storage ${xhr.status}`)))
    xhr.onerror = () => reject(new Error('network'))
    const form = new FormData()
    form.append('cacheControl', '3600')
    form.append('', file)
    xhr.send(form)
  })
}

export type CreativeUploadEvent =
  | { phase: 'waiting' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'processing' }
  | { phase: 'ready'; videoId?: string; thumbnailUrl?: string | null; imageHash?: string }
  | { phase: 'error'; error: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Sube un video o imagen hasta dejarlo listo en Meta, avisando cada etapa. */
export async function uploadCreative(file: File, onEvent: (e: CreativeUploadEvent) => void): Promise<void> {
  const isVideo = file.type.startsWith('video/')
  const sizeMb = file.size / (1024 * 1024)
  if (sizeMb > MAX_FILE_MB) {
    onEvent({
      phase: 'error',
      error: `Pesa ${Math.round(sizeMb)} MB y el máximo es ${MAX_FILE_MB} MB. Exportalo más liviano (por ejemplo en 1080p desde CapCut) y volvé a elegirlo.`,
    })
    return
  }
  onEvent({ phase: 'waiting' })
  try {
    await withSlot(async () => {
      onEvent({ phase: 'uploading', progress: 0 })
      const target = await getLibraryUploadUrlAction(file.name)
      if (!target.ok) throw new Error(target.error)
      await putToSignedUrl(target.path, target.token, file, (progress) => onEvent({ phase: 'uploading', progress }))
      onEvent({ phase: 'processing' })

      const res = await fetch(isVideo ? '/api/meta/upload-video' : '/api/meta/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: target.path, name: file.name }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; videoId?: string; hash?: string; error?: string }
      if (!data.ok) throw new Error(data.error || 'No se pudo subir el archivo.')

      if (!isVideo) {
        onEvent({ phase: 'ready', imageHash: data.hash })
        return
      }

      // El procesamiento de Meta ya no ocupa lugar en la fila de subidas.
      void followVideo(data.videoId as string, onEvent)
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    onEvent({ phase: 'error', error: msg && !/^(storage|network)/.test(msg) ? msg : 'No se pudo subir el archivo. Revisá la conexión y reintentá.' })
  }
}

async function followVideo(videoId: string, onEvent: (e: CreativeUploadEvent) => void) {
  // Hasta ~10 minutos: videos largos tardan en procesarse en Meta.
  for (let i = 0; i < 200; i++) {
    await sleep(i < 5 ? 2000 : 3000)
    const res = await fetch(`/api/meta/video-status?id=${videoId}`).catch(() => null)
    const data = res ? ((await res.json().catch(() => ({}))) as { ok?: boolean; status?: string; thumbnailUrl?: string | null }) : {}
    if (!data.ok) continue
    if (data.status === 'ready') return onEvent({ phase: 'ready', videoId, thumbnailUrl: data.thumbnailUrl ?? null })
    if (data.status === 'error') return onEvent({ phase: 'error', error: 'Meta no pudo procesar el video. Probá con otro archivo.' })
  }
  onEvent({ phase: 'error', error: 'Meta está tardando mucho en procesar el video. Reintentá en un rato.' })
}
