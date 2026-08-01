'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'

export type TiktokCrossPostResult = { ok: true; newPostId: string; hasMedia: boolean } | { ok: false; error: string }

/**
 * "Escalar a Instagram" — a diferencia de crossPostAction (content/
 * cross-post-actions.ts, que clona un Archivo Final que Gotix ya tiene
 * subido), acá el origen es un video que vive solo en TikTok: no hay
 * ningún archivo nuestro para reusar, y la Display API de TikTok no
 * garantiza un MP4 descargable (ver src/lib/tiktok/videos.ts). Crea el
 * borrador igual, con el caption pre-cargado — si video_download_url no
 * está disponible, queda en production_status='idea' (no
 * 'listo_para_programar') y hasMedia:false, para que la UI le pida al
 * usuario subir el Archivo Final a mano antes de poder programarlo.
 */
export async function crossPostTiktokVideoAction(tiktokVideoId: string): Promise<TiktokCrossPostResult> {
  try {
    const { userId, activeOrganizationId } = await getDashboardContext()
    if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

    const supabase = await createClient()
    const { data: video, error } = await supabase
      .from('tiktok_videos')
      .select('description, video_download_url')
      .eq('id', tiktokVideoId)
      .eq('organization_id', activeOrganizationId)
      .maybeSingle()

    // El detalle técnico (Postgres/RLS) se loguea server-side para poder
    // diagnosticar — el usuario final solo ve un mensaje claro (regla fija,
    // 2026-08-01). Antes esto tragaba el error en silencio directamente;
    // ahora se loguea Y se muestra un mensaje limpio, nunca ninguno de los
    // dos extremos (ni silencio total, ni mensaje técnico crudo).
    if (error) {
      console.error('[crossPostTiktokVideoAction] lectura del video falló:', error.message)
      return { ok: false, error: 'No pudimos leer ese video. Probá de nuevo en unos minutos.' }
    }
    if (!video) return { ok: false, error: 'No encontramos el video de origen.' }

    const hasMedia = !!video.video_download_url

    const { data: inserted, error: insertError } = await supabase
      .from('content_posts')
      .insert({
        organization_id: activeOrganizationId,
        user_id: userId,
        title: 'Escalado desde TikTok',
        caption: video.description,
        platform: 'Instagram',
        format: 'Reel',
        turno: 'Temprano',
        status: 'pendiente',
        production_status: hasMedia ? 'listo_para_programar' : 'idea',
        media_url: video.video_download_url,
        media_type: hasMedia ? 'video' : null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[crossPostTiktokVideoAction] insert falló:', insertError.message)
      return { ok: false, error: 'No pudimos crear la republicación. Probá de nuevo en unos minutos.' }
    }
    if (!inserted) return { ok: false, error: 'No pudimos crear la republicación. Probá de nuevo.' }

    revalidatePath('/content')
    return { ok: true, newPostId: inserted.id, hasMedia }
  } catch (err) {
    // Cualquier excepción no prevista queda acá en vez de rechazar la
    // promise — si esto no estuviera, handleEscalate (tiktok-performance-
    // section.tsx) se quedaría con el botón trabado en "Escalando…" para
    // siempre, porque nunca llegaría a setEscalatingId(null). El detalle
    // real queda en el log del servidor, no en pantalla.
    console.error('[crossPostTiktokVideoAction] excepción inesperada:', err)
    return { ok: false, error: 'Error inesperado al escalar el video. Probá de nuevo en unos minutos.' }
  }
}
