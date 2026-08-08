'use server'

import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getMetaPixels, getMetaPages, getMetaAudiences, getMetaExistingPosts } from '@/lib/meta/ad-launch'
import { getMetaCampaigns } from '@/lib/meta/campaigns'
import { getLibraryCreatives, type LibraryCreative } from '@/lib/meta/library'
import { getContentPillars, type ContentPillar } from '@/lib/pillars'
import type { MetaPixel, MetaPage, MetaAudience, MetaExistingPost } from '@/lib/meta/ad-launch'
import type { Database } from '@/lib/types/database.types'

type ScriptOption = { id: string; title: string | null; hook: string | null; body: string | null; copy_feed: string | null }
export type InstagramPostOption = Database['public']['Tables']['instagram_media_catalog']['Row']

export type LaunchWizardData =
  | { status: 'no_org' }
  | { status: 'not_connected' }
  | { status: 'expired' }
  | { status: 'needs_reconnect' }
  | {
      status: 'ready'
      pixels: MetaPixel[]
      pages: MetaPage[]
      audiences: MetaAudience[]
      existingPosts: MetaExistingPost[]
      existingCampaigns: { id: string; name: string; status: string }[]
      scripts: ScriptOption[]
      libraryCreatives: LibraryCreative[]
      // "Publicitar un posteo orgánico" (2026-08-06) — instagramPosts sale
      // del catálogo YA sincronizado (instagram_media_catalog), sin pedirle
      // nada nuevo a la Graph API acá. igActorId es instagram_connections.
      // ig_user_id — null si Instagram no está conectado, en cuyo caso el
      // modo simplemente no se ofrece (ver ad-editor.tsx).
      instagramPosts: InstagramPostOption[]
      igActorId: string | null
      pillars: ContentPillar[]
    }

/**
 * Junta todo lo que el wizard "Lanzar Testeo" necesita antes de mostrarse.
 * Vive en una Server Action (no en un page.tsx) porque el wizard ahora es un
 * modal que se abre encima de la tabla de campañas, no una ruta aparte — se
 * llama recién cuando el usuario lo abre, no en cada carga de la lista.
 */
export async function getLaunchWizardDataAction(): Promise<LaunchWizardData> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { status: 'no_org' }

  const supabase = await createClient()
  const { data: connection } = await supabase
    .from('meta_connections')
    .select('token, account_id, expires_at')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  if (!connection) return { status: 'not_connected' }

  const tokenExpired = connection.expires_at ? new Date(connection.expires_at) < new Date() : false
  if (tokenExpired) return { status: 'expired' }

  const [
    pixelsResult,
    pagesResult,
    audiencesResult,
    existingPostsResult,
    campaignsResult,
    scriptsResult,
    libraryResult,
    instagramConnectionResult,
    instagramPostsResult,
    pillars,
  ] = await Promise.all([
    getMetaPixels(connection.token, connection.account_id),
    getMetaPages(connection.token),
    getMetaAudiences(connection.token, connection.account_id),
    getMetaExistingPosts(connection.token, connection.account_id),
    getMetaCampaigns(connection.token, connection.account_id),
    supabase
      .from('scripts')
      .select('id, title, hook, body, copy_feed')
      .eq('organization_id', activeOrganizationId)
      .order('updated_at', { ascending: false }),
    getLibraryCreatives(supabase, activeOrganizationId),
    supabase.from('instagram_connections').select('ig_user_id').eq('organization_id', activeOrganizationId).maybeSingle(),
    // Últimos 30, ordenados por fecha — alcanza para elegir "un posteo
    // reciente que rindió bien" sin traer el historial completo a un
    // wizard que se abre en un modal.
    supabase
      .from('instagram_media_catalog')
      .select('*')
      .eq('organization_id', activeOrganizationId)
      .order('posted_at', { ascending: false, nullsFirst: false })
      .limit(30),
    getContentPillars(supabase, activeOrganizationId),
  ])

  const pixels = pixelsResult.ok ? pixelsResult.pixels : []
  const pages = pagesResult.ok ? pagesResult.pages : []
  const audiences = audiencesResult.ok ? audiencesResult.audiences : []
  const existingPosts = existingPostsResult.ok ? existingPostsResult.posts : []
  const existingCampaigns = campaignsResult.ok
    ? campaignsResult.campaigns.map((c) => ({ id: c.id, name: c.name, status: c.effectiveStatus }))
    : []
  const scripts = scriptsResult.data ?? []
  // Solo los disponibles — 'in_use'/'paused' no se ofrecen para un lanzamiento nuevo.
  const libraryCreatives = libraryResult.filter((c) => c.status === 'active')
  const igActorId = instagramConnectionResult.data?.ig_user_id ?? null
  // Solo publicaciones con media real — un item sin media_url no sirve como
  // creativo (mismo criterio que ConvertToCampaignAction en Contenido).
  const instagramPosts = (instagramPostsResult.data ?? []).filter((p) => p.media_url && p.media_type !== 'CAROUSEL_ALBUM')

  // pages_show_list se sumó al scope después de que muchas conexiones ya
  // existían — sin páginas no se puede armar el creativo, así que lo
  // marcamos como bloqueante en vez de dejar que falle recién al enviar.
  if (pages.length === 0) return { status: 'needs_reconnect' }

  return {
    status: 'ready',
    pixels,
    pages,
    audiences,
    existingPosts,
    existingCampaigns,
    scripts,
    libraryCreatives,
    instagramPosts,
    igActorId,
    pillars,
  }
}
