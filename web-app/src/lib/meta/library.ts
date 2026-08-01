import type { SupabaseClient } from '@supabase/supabase-js'

// Biblioteca de Ads — banco de creativos org-scoped listos para lanzar.
// Mismo bucket "piezas-media" que usa Contenido, pero la subida NO pasa por
// un Server Action (a diferencia de content/actions.ts): un video de
// anuncio real fácilmente supera el límite de body de los Server Actions
// de Next (y cualquier límite propio que tenga la plataforma de hosting,
// ej. Vercel) — acá el navegador sube directo a Supabase Storage con una
// URL firmada (getSignedUploadTarget), el archivo nunca toca el proceso de
// Next. Ver creative-form.tsx para el flujo completo del lado cliente.

export type CreativeType = 'image' | 'video'
export type CreativeStatus = 'active' | 'in_use' | 'paused'

export type LibraryCreative = {
  id: string
  name: string
  assetType: CreativeType
  fileUrl: string
  primaryText: string | null
  headline: string | null
  cta: string
  status: CreativeStatus
  deployedAdId: string | null
  deployedAt: string | null
  createdAt: string
  // Puente Guiones → Biblioteca de Ads — null si el creativo se subió
  // suelto, sin pasar por "Convertir a Anuncio" en un guion.
  sourceScriptId: string | null
  sourceScriptTitle: string | null
}

// Nomenclatura de estados (2026-07-27) — antes "active" se mostraba como
// "Activo", que el usuario confunde con "en vivo en Meta" (no lo está: es un
// creativo LOCAL disponible para que el Autopiloto lo tome). Centralizado
// acá porque library-grid.tsx y linked-creatives.tsx mantenían cada uno su
// propia copia de este mapeo — dos copias que ya habían empezado a existir
// por separado es exactamente el tipo de drift que rompe una futura edición.
export const CREATIVE_STATUS_LABEL: Record<CreativeStatus, string> = {
  active: 'Disponible',
  in_use: 'En uso',
  paused: 'Pausado',
}

export const CREATIVE_STATUS_BADGE_CLASS: Record<CreativeStatus, string> = {
  active: 'border-green/40 bg-green/[8%] text-green',
  in_use: 'border-amber/40 bg-amber/[8%] text-amber',
  paused: 'border-border text-text-2',
}

// Subconjunto curado de los call_to_action reales de Meta, pensado para
// e-commerce — no los ~30 tipos que soporta la Graph API completa.
export const CTA_OPTIONS: { value: string; label: string }[] = [
  { value: 'SHOP_NOW', label: 'Comprar ahora' },
  { value: 'LEARN_MORE', label: 'Más información' },
  { value: 'SIGN_UP', label: 'Registrarse' },
  { value: 'GET_OFFER', label: 'Ver oferta' },
  { value: 'MESSAGE_PAGE', label: 'Enviar mensaje' },
  { value: 'SUBSCRIBE', label: 'Suscribirse' },
  { value: 'CONTACT_US', label: 'Contactarnos' },
]

export async function getLibraryCreatives(supabase: SupabaseClient, organizationId: string): Promise<LibraryCreative[]> {
  const { data } = await supabase
    .from('library_creatives')
    .select(
      'id, name, asset_type, file_url, primary_text, headline, cta, status, deployed_ad_id, deployed_at, created_at, source_script_id, scripts(title)'
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    assetType: row.asset_type as CreativeType,
    fileUrl: row.file_url,
    primaryText: row.primary_text,
    headline: row.headline,
    cta: row.cta,
    status: row.status as CreativeStatus,
    deployedAdId: row.deployed_ad_id,
    deployedAt: row.deployed_at,
    createdAt: row.created_at,
    sourceScriptId: row.source_script_id,
    // PostgREST devuelve el embed FK a-uno como objeto en runtime; el
    // tipado hand-maintained de database.types.ts no lo modela con
    // precisión (por eso el paso por `unknown`), no es un riesgo real.
    sourceScriptTitle: (row.scripts as unknown as { title: string | null } | null)?.title ?? null,
  }))
}

/** Todos los creativos que nacieron de un guion puntual — usado en la página del guion ("Creativos vinculados"). */
export async function getCreativesByScriptId(
  supabase: SupabaseClient,
  organizationId: string,
  scriptId: string
): Promise<LibraryCreative[]> {
  const { data } = await supabase
    .from('library_creatives')
    .select('id, name, asset_type, file_url, primary_text, headline, cta, status, deployed_ad_id, deployed_at, created_at, source_script_id')
    .eq('organization_id', organizationId)
    .eq('source_script_id', scriptId)
    .order('created_at', { ascending: false })

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    assetType: row.asset_type as CreativeType,
    fileUrl: row.file_url,
    primaryText: row.primary_text,
    headline: row.headline,
    cta: row.cta,
    status: row.status as CreativeStatus,
    deployedAdId: row.deployed_ad_id,
    deployedAt: row.deployed_at,
    createdAt: row.created_at,
    sourceScriptId: row.source_script_id,
    sourceScriptTitle: null,
  }))
}

/**
 * Genera el path + token de una URL de subida firmada — el navegador sube
 * el archivo directo a Supabase Storage con esto (uploadToSignedUrl desde
 * un cliente browser), sin que el archivo pase por este servidor. Requiere
 * permiso `insert` sobre storage.objects, que el bucket "piezas-media" ya
 * le da a cualquier usuario autenticado (mismo permiso que ya usa la
 * subida directa de Contenido).
 */
export async function getSignedUploadTarget(
  supabase: SupabaseClient,
  userId: string,
  fileName: string
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const ext = fileName.split('.').pop() || 'bin'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { data, error } = await supabase.storage.from('piezas-media').createSignedUploadUrl(path)
  if (error || !data) return { ok: false, error: 'No pudimos preparar la subida. Probá de nuevo.' }

  return { ok: true, path: data.path, token: data.token }
}

export async function insertLibraryCreative(
  supabase: SupabaseClient,
  params: {
    organizationId: string
    userId: string
    fileUrl: string
    assetType: CreativeType
    name: string
    primaryText: string | null
    headline: string | null
    cta: string
    sourceScriptId?: string | null
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from('library_creatives').insert({
    organization_id: params.organizationId,
    created_by: params.userId,
    name: params.name,
    asset_type: params.assetType,
    file_url: params.fileUrl,
    primary_text: params.primaryText,
    headline: params.headline,
    cta: params.cta,
    source_script_id: params.sourceScriptId ?? null,
  })

  return error ? { ok: false, error: 'No pudimos guardar el creativo. Probá de nuevo.' } : { ok: true }
}

/** Editar un creativo local ya cargado — Título/Copy/Hook (2026-07-27), sin tener que borrar y resubir el archivo. El archivo en sí no es editable acá (mismo criterio que el resto de la Biblioteca: si cambia el archivo, es un creativo nuevo). */
export async function updateLibraryCreative(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  params: { name: string; headline: string | null; primaryText: string | null }
): Promise<boolean> {
  const { error } = await supabase
    .from('library_creatives')
    .update({ name: params.name, headline: params.headline, primary_text: params.primaryText })
    .eq('organization_id', organizationId)
    .eq('id', id)
  return !error
}

export async function setLibraryCreativeStatus(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  status: CreativeStatus
): Promise<boolean> {
  const { error } = await supabase.from('library_creatives').update({ status }).eq('organization_id', organizationId).eq('id', id)
  return !error
}

export async function deleteLibraryCreative(supabase: SupabaseClient, organizationId: string, id: string): Promise<boolean> {
  const { error } = await supabase.from('library_creatives').delete().eq('organization_id', organizationId).eq('id', id)
  return !error
}

// ---------------------------------------------------------------------------
// Integración con el wizard de lanzamiento manual ("Lanzar Testeo") — un
// activo de la Biblioteca se puede elegir en vez de subir un archivo
// fresco. Ver campaigns/actions.ts (launchTestCampaignAction, rama
// ad.mode === 'library').
// ---------------------------------------------------------------------------

export type LibraryCreativeFull = LibraryCreative & { metaImageHash: string | null; metaVideoId: string | null }

export async function getLibraryCreativeById(
  supabase: SupabaseClient,
  organizationId: string,
  id: string
): Promise<LibraryCreativeFull | null> {
  const { data } = await supabase
    .from('library_creatives')
    .select(
      'id, name, asset_type, file_url, primary_text, headline, cta, status, deployed_ad_id, deployed_at, created_at, meta_image_hash, meta_video_id, source_script_id'
    )
    .eq('organization_id', organizationId)
    .eq('id', id)
    .maybeSingle()

  if (!data) return null
  return {
    id: data.id,
    name: data.name,
    assetType: data.asset_type as CreativeType,
    fileUrl: data.file_url,
    primaryText: data.primary_text,
    headline: data.headline,
    cta: data.cta,
    status: data.status as CreativeStatus,
    deployedAdId: data.deployed_ad_id,
    deployedAt: data.deployed_at,
    createdAt: data.created_at,
    metaImageHash: data.meta_image_hash,
    metaVideoId: data.meta_video_id,
    sourceScriptId: data.source_script_id,
    sourceScriptTitle: null,
  }
}

/**
 * Cachea el hash/id de Meta la primera vez que este activo se sube (evita
 * resubirlo en el próximo lanzamiento o rotación que lo use), y lo marca
 * "en uso" en el anuncio recién creado — mismo criterio que ya aplica la
 * rotación automática de Anti-Fatiga (autopilot-run/index.ts), así "qué
 * anuncio está usando este creativo" es verdad sin importar quién lo desplegó.
 */
/**
 * Defensa en profundidad (auditoría de cierre, 2026-07-30): el único caller
 * (campaigns/actions.ts) ya valida el id vía getLibraryCreativeById
 * (org-scoped) antes de llegar acá, y la policy de UPDATE en
 * library_creatives también es org-scoped — este filtro no cierra un hueco
 * explotable hoy, pero evita que un futuro caller que se salte esa
 * validación previa pueda pisar el creativo de otra organización.
 */
export async function markLibraryCreativeDeployed(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  params: { deployedAdId: string; metaImageHash?: string | null; metaVideoId?: string | null }
): Promise<void> {
  await supabase
    .from('library_creatives')
    .update({
      status: 'in_use',
      deployed_ad_id: params.deployedAdId,
      deployed_at: new Date().toISOString(),
      ...(params.metaImageHash !== undefined ? { meta_image_hash: params.metaImageHash } : {}),
      ...(params.metaVideoId !== undefined ? { meta_video_id: params.metaVideoId } : {}),
    })
    .eq('id', id)
    .eq('organization_id', organizationId)
}
