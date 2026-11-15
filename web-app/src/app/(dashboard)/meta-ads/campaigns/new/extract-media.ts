'use client'

// Copy automático (2026-11-15): todo lo pesado se hace en el navegador para
// que al servidor solo viaje lo justo (Vercel corta a los 4,5 MB):
// - Audio: se decodifica el video, se pasa a mono 16 kHz y se recorta a
//   MAX_AUDIO_SECONDS → un WAV de ~2 MB, alcanza para transcribir lo que se dice.
// - Imágenes: 3 cuadros del video (o la imagen misma) achicados a 640 px,
//   para que la IA lea los textos en pantalla y vea el producto.

const MAX_AUDIO_SECONDS = 60
const SAMPLE_RATE = 16000
const FRAME_WIDTH = 640

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const write = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  write(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** WAV en base64 con la voz del video, o null si no tiene audio o no se pudo leer. */
export async function extractAudio(file: File): Promise<string | null> {
  try {
    const ctx = new AudioContext()
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer())
    void ctx.close()
    const seconds = Math.min(decoded.duration, MAX_AUDIO_SECONDS)
    if (seconds < 0.5) return null
    const offline = new OfflineAudioContext(1, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start(0)
    const rendered = await offline.startRendering()
    const samples = rendered.getChannelData(0)
    // Video sin sonido (o solo silencio): no vale la pena transcribir.
    let peak = 0
    for (let i = 0; i < samples.length; i += 400) peak = Math.max(peak, Math.abs(samples[i]))
    if (peak < 0.01) return null
    return blobToBase64(encodeWav(samples, SAMPLE_RATE))
  } catch {
    return null
  }
}

function drawToJpeg(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, FRAME_WIDTH / width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.7)
}

/** 3 cuadros del video (inicio, medio, final) o la imagen, como JPEG en data URL. */
export async function extractFrames(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file)
  try {
    if (file.type.startsWith('image/')) {
      const img = new Image()
      img.src = url
      await img.decode()
      return [drawToJpeg(img, img.naturalWidth, img.naturalHeight)]
    }
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'auto'
    video.src = url
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error('video'))
    })
    const frames: string[] = []
    for (const at of [0.12, 0.5, 0.85]) {
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve()
        video.currentTime = Math.max(0, video.duration * at)
      })
      frames.push(drawToJpeg(video, video.videoWidth, video.videoHeight))
    }
    return frames
  } catch {
    return []
  } finally {
    URL.revokeObjectURL(url)
  }
}

export type AdCopyVariant = { texto: string; titulo: string; descripcion: string }
export type AdCopyResult = { ok: true; variantes: AdCopyVariant[]; transcripcion: string | null } | { ok: false; error: string }

// De a 2 a la vez: con 9 videos, que no salgan las 9 consultas juntas.
let running = 0
const queue: Array<() => void> = []

/** Escucha y mira el video y devuelve 3 opciones de copy. */
export async function generateAdCopy(file: File, productUrl: string): Promise<AdCopyResult> {
  if (running >= 2) await new Promise<void>((resolve) => queue.push(resolve))
  running++
  try {
    const [audio, frames] = await Promise.all([file.type.startsWith('video/') ? extractAudio(file) : Promise.resolve(null), extractFrames(file)])
    if (!audio && frames.length === 0) return { ok: false, error: 'No pudimos leer el archivo para escribir el copy.' }
    const res = await fetch('/api/ai/ad-copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio, frames, productUrl, fileName: file.name }),
    })
    const data = (await res.json().catch(() => ({}))) as AdCopyResult
    if (!('ok' in data)) return { ok: false, error: 'No se pudo escribir el copy. Probá de nuevo.' }
    return data
  } catch {
    return { ok: false, error: 'No se pudo escribir el copy. Probá de nuevo.' }
  } finally {
    running--
    queue.shift()?.()
  }
}
