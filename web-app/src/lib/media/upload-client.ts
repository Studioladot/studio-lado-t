// Subida directa cliente→Storage (bug real reportado, 2026-08-06): antes
// los archivos viajaban dentro del body de la Server Action (cliente →
// función serverless de Vercel → Storage). Vercel aplica un límite de body
// duro de ~4.5MB a las funciones serverless — no configurable desde
// next.config (bodySizeLimit ahí ya estaba en 200mb sin efecto real) — así
// que cualquier foto/video de verdad rebotaba con 413 antes de llegar a
// nuestro código. Acá el navegador sube directo al bucket con su propia
// sesión (mismo anon key + cookie que ya usa el server, mismas políticas
// RLS de Storage), y el Server Action solo recibe la URL pública ya
// resuelta — un string, nunca los bytes del archivo.

import { createClient } from '@/lib/supabase/client'
import { validateMediaFile } from './validate-upload'

export type MediaItem = { url: string; type: 'image' | 'video' }

export async function uploadReferenceFilesClient(files: File[]): Promise<{ media: MediaItem[]; error: string | null }> {
  if (files.length === 0) return { media: [], error: null }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { media: [], error: 'Tu sesión venció — recargá la página e iniciá sesión de nuevo.' }
  }

  const media: MediaItem[] = []

  for (const file of files) {
    const validation = await validateMediaFile(file)
    if (!validation.ok) {
      return { media, error: validation.error }
    }

    const ext = file.name.split('.').pop() || 'bin'
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error: uploadError } = await supabase.storage.from('piezas-media').upload(path, file)

    if (uploadError) {
      return { media, error: `No pudimos subir "${file.name}". Probá de nuevo.` }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('piezas-media').getPublicUrl(path)

    media.push({ url: publicUrl, type: validation.kind })
  }

  return { media, error: null }
}
