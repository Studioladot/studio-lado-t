// Validación server-side de archivos subidos por el usuario (auditoría de
// cierre, 2026-07-30) — antes, content/actions.ts, campaigns/[id]/actions.ts
// y notes/actions.ts subían cualquier File directo a Supabase Storage sin
// chequear peso ni tipo real, confiando solo en el atributo `accept` del
// <input> del cliente (trivial de saltear) y en `file.type` (un string que
// arma el browser a partir de la extensión del archivo — un .exe renombrado
// a .jpg reporta `type: 'image/jpeg'` sin que nadie lo verifique). Acá se
// sniffea el contenido real (los primeros bytes, "magic numbers") en vez de
// confiar en esos dos campos.
//
// Compartido por los 3 puntos de subida en vez de triplicar la misma lógica
// — el mismo patrón de "se corrige en un lugar y reaparece en el próximo
// formulario nuevo" que ya pasó con los colores hardcodeados (ver
// form-field.tsx) es exactamente lo que esto evita.

export type MediaKind = 'image' | 'video'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB
// Bug real reportado (2026-08-05): "cuando subo un video largo, sube el
// error" — 100MB se quedaba corto para cualquier clip de referencia de más
// de unos pocos minutos en calidad de cámara de teléfono. 500MB cubre video
// largo real sin abrir la puerta a archivos que Supabase Storage no maneja
// bien de todos modos.
const MAX_VIDEO_BYTES = 500 * 1024 * 1024 // 500MB

function matchesSignature(head: Uint8Array, offset: number, bytes: number[]): boolean {
  return bytes.every((b, i) => head[offset + i] === b)
}

/** Formatos que Instagram/la app realmente necesitan aceptar — no una lista exhaustiva de todos los formatos de imagen/video que existen. */
async function sniffMediaKind(file: File): Promise<MediaKind | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())

  if (matchesSignature(head, 0, [0xff, 0xd8, 0xff])) return 'image' // JPEG
  if (matchesSignature(head, 0, [0x89, 0x50, 0x4e, 0x47])) return 'image' // PNG
  if (matchesSignature(head, 0, [0x47, 0x49, 0x46, 0x38])) return 'image' // GIF
  if (matchesSignature(head, 0, [0x52, 0x49, 0x46, 0x46]) && matchesSignature(head, 8, [0x57, 0x45, 0x42, 0x50])) return 'image' // WEBP (RIFF....WEBP)
  if (matchesSignature(head, 4, [0x66, 0x74, 0x79, 0x70])) return 'video' // MP4/MOV/QuickTime (caja "ftyp")
  if (matchesSignature(head, 0, [0x1a, 0x45, 0xdf, 0xa3])) return 'video' // WEBM/MKV (EBML)

  return null
}

export type MediaValidationResult = { ok: true; kind: MediaKind } | { ok: false; error: string }

export async function validateMediaFile(file: File): Promise<MediaValidationResult> {
  const kind = await sniffMediaKind(file)
  if (!kind) {
    return {
      ok: false,
      error: `"${file.name}" no es una imagen o un video en un formato admitido (JPEG, PNG, GIF, WEBP, MP4, MOV, WEBM).`,
    }
  }

  const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `"${file.name}" pesa más de ${Math.round(maxBytes / (1024 * 1024))}MB — subí un archivo más liviano.`,
    }
  }

  return { ok: true, kind }
}
