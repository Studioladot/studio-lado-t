import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Autopiloto real — corre por pg_cron (ver la migración
// web-app/supabase/migrations/20260724125608_autopilot_org_scoped.sql,
// 'autopilot-run-hourly') contra las 3 tablas org-scoped nuevas. Reemplaza
// autopilot-nightly/, que nunca estuvo conectada a ningún disparador real.
//
// computeMetrics acá abajo es un espejo intencional de la función homónima
// en web-app/src/lib/meta/campaigns.ts — no se puede importar cross-runtime
// (Deno vs Next.js), así que las mismas fórmulas viven en los dos lugares.
// Si cambia una, cambia la otra.
//
// Autorización por rol de JWT (audit check 2026-07-24): antes esta función
// no distinguía quién la llamaba — cualquier JWT válido de Supabase (hasta
// la anon key, que no es secreta) alcanzaba para procesar TODAS las
// organizaciones. La plataforma de Supabase ya verifica la firma del JWT
// antes de invocar la función (verify_jwt no está desactivado en el
// deploy), así que leer el claim `role` acá no es una segunda
// verificación — es leer un token en el que la plataforma ya confió:
//   - role === 'service_role' (pg_cron, la Vault key) → corrida completa
//     sin acotar, igual que siempre.
//   - role === 'authenticated' (un usuario real desde la UI) → obligatorio
//     organizationId + campaignId en el body; se valida con
//     supabase.auth.getUser() (cliente con anon key, reenviando el header
//     del caller) que el token es real, y que ese usuario es miembro de esa
//     organización — recién ahí se acota la corrida a esa campaña.
//   - cualquier otro caso (anon, inválido, ausente) → 401.

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'
const MAX_BUDGET_INCREASE_PCT = 30
const MAX_BUDGET_DECREASE_PCT = 50
const MAX_ACTIONS_PER_ORG_PER_RUN = 20

const ATC_ACTION_TYPES = ['add_to_cart', 'offsite_conversion.fb_pixel_add_to_cart']
const IC_ACTION_TYPES = ['initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout']

type GraphAction = { action_type: string; value: string }
type GraphInsight = {
  spend?: string
  impressions?: string
  ctr?: string
  cpm?: string
  cpc?: string
  frequency?: string
  inline_link_clicks?: string
  action_values?: GraphAction[]
  actions?: GraphAction[]
  video_play_actions?: GraphAction[]
  date_start?: string
}

type RuleCondition = { metric: string; operator: 'lt' | 'gt' | 'eq'; value: number }
type RuleParams = { budgetChangePct?: number }

// Espejo intencional de computeMetrics en src/lib/meta/campaigns.ts (no se
// puede cross-importar Deno/Next.js) — hasta la auditoría de cierre
// (2026-07-30) le faltaban cpm/costPerIC/costPerATC acá, lo que dejaba a
// evalConditions() de reglas custom tratando esos 3 campos como "nunca
// verdadero" en silencio en vez de un error si alguna regla llegara a
// usarlos. Si cambia una función, cambia la otra.
function computeMetrics(ins: GraphInsight | undefined) {
  const spend = Number(ins?.spend ?? 0)
  const impressions = Number(ins?.impressions ?? 0)
  const revenue = Number(ins?.action_values?.find((a) => a.action_type === 'purchase')?.value ?? 0)
  const purchases = Number(ins?.actions?.find((a) => a.action_type === 'purchase')?.value ?? 0)
  const videoViews = Number(ins?.video_play_actions?.find((a) => a.action_type === 'video_view')?.value ?? 0)
  const initiateCheckout = Number(ins?.actions?.find((a) => IC_ACTION_TYPES.includes(a.action_type))?.value ?? 0)
  const addToCart = Number(ins?.actions?.find((a) => ATC_ACTION_TYPES.includes(a.action_type))?.value ?? 0)

  const roas = spend > 0 && revenue > 0 ? revenue / spend : 0
  const cpa = purchases > 0 ? spend / purchases : 0
  const ctr = Number(ins?.ctr ?? 0)
  const cpm = Number(ins?.cpm ?? 0)
  const cpc = Number(ins?.cpc ?? 0)
  const frequency = Number(ins?.frequency ?? 0)
  const linkClicks = Number(ins?.inline_link_clicks ?? 0)
  const hookRate = impressions > 0 ? Math.round((videoViews / impressions) * 1000) / 10 : 0
  const costPerIC = initiateCheckout > 0 ? spend / initiateCheckout : 0
  const costPerATC = addToCart > 0 ? spend / addToCart : 0
  const aov = purchases > 0 ? revenue / purchases : 0

  return {
    spend,
    revenue,
    purchases,
    roas,
    cpa,
    ctr,
    cpm,
    cpc,
    frequency,
    linkClicks,
    hookRate,
    initiateCheckout,
    addToCart,
    costPerIC,
    costPerATC,
    aov,
    impressions,
  }
}

async function graphGet(path: string, token: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH_BASE}/${path}`)
  url.searchParams.set('access_token', token)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url)
  return res.json()
}

async function graphPost(id: string, token: string, body: Record<string, string>) {
  const res = await fetch(`${GRAPH_BASE}/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...body, access_token: token }),
  })
  return res.json()
}

function dateRange(days: number) {
  const until = new Date()
  const since = new Date(Date.now() - days * 86400000)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { since: fmt(since), until: fmt(until) }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(input.length + ((4 - (input.length % 4)) % 4), '=')
  return atob(padded)
}

function decodeJwtRole(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const parts = authHeader.slice(7).split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    return null
  }
}

// Códigos reales de la Graph API de Meta — 190 es OAuthException (token
// vencido/revocado); 4/17/32/613 son los distintos "request limit reached"
// (app/usuario/página/cuenta). Cualquier otro error de Graph (ej: un ID de
// campaña inválido) es un problema puntual de esa llamada, no de la
// conexión — no amerita apagar el resto de la organización.
function classifyGraphError(data: { error?: { code?: number } }): 'auth' | 'rate_limit' | 'other' | null {
  const code = Number(data?.error?.code)
  if (!data?.error) return null
  if (code === 190) return 'auth'
  if ([4, 17, 32, 613].includes(code)) return 'rate_limit'
  return 'other'
}

function evalConditions(m: ReturnType<typeof computeMetrics>, conditions: RuleCondition[]): boolean {
  return conditions.every((c) => {
    const actual = (m as unknown as Record<string, number>)[c.metric]
    if (typeof actual !== 'number') return false
    if (c.operator === 'lt') return actual < c.value
    if (c.operator === 'gt') return actual > c.value
    return actual === c.value
  })
}

function describeConditions(conditions: RuleCondition[]): string {
  const opLabel: Record<string, string> = { lt: '<', gt: '>', eq: '=' }
  return conditions.map((c) => `${c.metric} ${opLabel[c.operator] ?? c.operator} ${c.value}`).join(' y ')
}

// ---------------------------------------------------------------------------
// Rotación real de creativo (Anti-Fatiga + Biblioteca de Ads, 2026-07-24).
// Mini-mirror Deno de src/lib/meta/ad-launch.ts (uploadMetaAdImage,
// uploadMetaAdVideo+waitForMetaVideoReady, createTestAdCreative(Video),
// createTestAd) — no se puede cross-importar ese archivo (Node vs Deno),
// mismo motivo que computeMetrics ya está duplicado arriba. Acá es más
// simple: sin audiencia/targeting, que no aplica a una rotación.
// ---------------------------------------------------------------------------

/** btoa(String.fromCharCode(...bytes)) sin el spread se rompe con archivos grandes (limite de argumentos de la call stack) — se arma en chunks. */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

async function uploadImageToMeta(token: string, accountId: string, fileUrl: string): Promise<{ ok: true; hash: string } | { ok: false; error: string }> {
  try {
    const fileRes = await fetch(fileUrl)
    if (!fileRes.ok) return { ok: false, error: 'No pudimos descargar el creativo de la Biblioteca.' }
    const base64 = bufferToBase64(await fileRes.arrayBuffer())
    const res = await fetch(`${GRAPH_BASE}/act_${accountId}/adimages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ bytes: base64, access_token: token }),
    })
    const data = await res.json()
    if (data.error) return { ok: false, error: data.error.message ?? 'Meta rechazó la imagen.' }
    const first = data.images ? (Object.values(data.images)[0] as { hash?: string }) : undefined
    if (!first?.hash) return { ok: false, error: 'Meta no devolvió un hash de imagen válido.' }
    return { ok: true, hash: first.hash }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red subiendo la imagen.' }
  }
}

async function uploadVideoToMeta(token: string, accountId: string, fileUrl: string): Promise<{ ok: true; videoId: string } | { ok: false; error: string }> {
  try {
    const fileRes = await fetch(fileUrl)
    if (!fileRes.ok) return { ok: false, error: 'No pudimos descargar el creativo de la Biblioteca.' }
    const form = new FormData()
    form.append('access_token', token)
    form.append('source', new Blob([await fileRes.arrayBuffer()]), 'creative.mp4')
    const res = await fetch(`${GRAPH_BASE}/act_${accountId}/advideos`, { method: 'POST', body: form })
    const data = await res.json()
    if (data.error) return { ok: false, error: data.error.message ?? 'Meta rechazó el video.' }
    if (!data.id) return { ok: false, error: 'Meta no devolvió un ID de video válido.' }
    return { ok: true, videoId: data.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red subiendo el video.' }
  }
}

/**
 * Mismo polling que waitForMetaVideoReady del lado Next.js, pero con un
 * techo más corto (40s, no 45s) — esto corre en medio de una corrida de
 * cron que procesa TODAS las organizaciones; una rotación de video no
 * puede comerse el tiempo del resto de la corrida.
 */
async function waitForVideoReady(token: string, videoId: string, timeoutMs = 40000): Promise<{ ok: true; thumbnailUrl: string | null } | { ok: false; error: string }> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const statusData = await graphGet(videoId, token, { fields: 'status' })
    const videoStatus = statusData?.status?.video_status
    if (videoStatus === 'ready') {
      const thumbsData = await graphGet(`${videoId}/thumbnails`, token, {})
      const thumbs: { uri?: string; is_preferred?: boolean }[] = thumbsData?.data ?? []
      const preferred = thumbs.find((t) => t.is_preferred) ?? thumbs[0]
      return { ok: true, thumbnailUrl: preferred?.uri ?? null }
    }
    if (videoStatus === 'error') return { ok: false, error: 'Meta no pudo procesar el video de la Biblioteca.' }
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
  return { ok: false, error: 'El video de la Biblioteca tardó demasiado en procesarse.' }
}

async function createImageCreative(
  token: string,
  accountId: string,
  params: { name: string; pageId: string; imageHash: string; link: string; headline: string | null; message: string | null; cta: string }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const objectStorySpec = {
    page_id: params.pageId,
    link_data: {
      image_hash: params.imageHash,
      link: params.link,
      message: params.message ?? '',
      name: params.headline ?? '',
      call_to_action: { type: params.cta },
    },
  }
  return metaCreativePost(token, accountId, params.name, objectStorySpec)
}

async function createVideoCreative(
  token: string,
  accountId: string,
  params: {
    name: string
    pageId: string
    videoId: string
    thumbnailUrl: string | null
    link: string
    headline: string | null
    message: string | null
    cta: string
  }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const videoData: Record<string, unknown> = {
    video_id: params.videoId,
    title: params.headline ?? '',
    message: params.message ?? '',
    link_description: params.message ?? '',
    call_to_action: { type: params.cta, value: { link: params.link } },
  }
  if (params.thumbnailUrl) videoData.image_url = params.thumbnailUrl
  return metaCreativePost(token, accountId, params.name, { page_id: params.pageId, video_data: videoData })
}

async function metaCreativePost(
  token: string,
  accountId: string,
  name: string,
  objectStorySpec: Record<string, unknown>
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const res = await fetch(`${GRAPH_BASE}/act_${accountId}/adcreatives`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ name, object_story_spec: JSON.stringify(objectStorySpec), access_token: token }),
  })
  const data = await res.json()
  if (data.error) return { ok: false, error: data.error.message ?? 'Meta rechazó el creativo.' }
  return { ok: true, id: data.id }
}

async function createAdFromCreative(
  token: string,
  accountId: string,
  params: { name: string; adsetId: string; creativeId: string }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const res = await fetch(`${GRAPH_BASE}/act_${accountId}/ads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      name: params.name,
      adset_id: params.adsetId,
      creative: JSON.stringify({ creative_id: params.creativeId }),
      status: 'ACTIVE',
      access_token: token,
    }),
  })
  const data = await res.json()
  if (data.error) return { ok: false, error: data.error.message ?? 'Meta rechazó el anuncio nuevo.' }
  return { ok: true, id: data.id }
}

type RotationResult = { ok: true; newAdId: string; creativeName: string } | { ok: false; reason: string }

/**
 * Orquesta la rotación completa: busca el creativo disponible más antiguo
 * de la Biblioteca (FIFO, pool de cuenta), sube el asset a Meta si hace
 * falta (cachea hash/video_id para no repetirlo en rotaciones futuras del
 * mismo activo), crea el anuncio nuevo YA ACTIVO, y recién si eso salió
 * bien pausa el anuncio fatigado — nunca al revés, para no quedarse sin
 * anuncio activo en ese conjunto si algo del medio falla.
 */
async function attemptCreativeRotation(
  supabase: SupabaseClient,
  token: string,
  accountId: string,
  organizationId: string,
  ad: { id: string; name: string }
): Promise<RotationResult> {
  const { data: asset } = await supabase
    .from('library_creatives')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!asset) return { ok: false, reason: 'no hay ningún creativo disponible en la Biblioteca para rotar' }

  const adInfo = await graphGet(ad.id, token, { fields: 'creative{object_story_spec},adset_id' })
  if (adInfo.error) return { ok: false, reason: 'no pudimos leer el anuncio original' }

  const spec = adInfo.creative?.object_story_spec
  const pageId: string | undefined = spec?.page_id
  const link: string | undefined = spec?.link_data?.link ?? spec?.video_data?.call_to_action?.value?.link
  const adsetId: string | undefined = adInfo.adset_id
  if (!pageId || !link || !adsetId) {
    return { ok: false, reason: 'no pudimos determinar la página o el link de destino del anuncio original' }
  }

  let imageHash: string | null = asset.meta_image_hash
  let videoId: string | null = asset.meta_video_id
  let thumbnailUrl: string | null = null

  if (asset.asset_type === 'image' && !imageHash) {
    const uploaded = await uploadImageToMeta(token, accountId, asset.file_url)
    if (!uploaded.ok) return { ok: false, reason: uploaded.error }
    imageHash = uploaded.hash
  }

  if (asset.asset_type === 'video' && !videoId) {
    const uploaded = await uploadVideoToMeta(token, accountId, asset.file_url)
    if (!uploaded.ok) return { ok: false, reason: uploaded.error }
    videoId = uploaded.videoId
    const ready = await waitForVideoReady(token, videoId)
    if (!ready.ok) return { ok: false, reason: ready.error }
    thumbnailUrl = ready.thumbnailUrl
  }

  const creativeName = `${asset.name} — rotación ${new Date().toISOString().split('T')[0]}`
  const creativeResult =
    asset.asset_type === 'image'
      ? await createImageCreative(token, accountId, {
          name: creativeName,
          pageId,
          imageHash: imageHash!,
          link,
          headline: asset.headline,
          message: asset.primary_text,
          cta: asset.cta,
        })
      : await createVideoCreative(token, accountId, {
          name: creativeName,
          pageId,
          videoId: videoId!,
          thumbnailUrl,
          link,
          headline: asset.headline,
          message: asset.primary_text,
          cta: asset.cta,
        })

  if (!creativeResult.ok) return { ok: false, reason: creativeResult.error }

  const newAdResult = await createAdFromCreative(token, accountId, {
    name: `${ad.name} (rotado)`,
    adsetId,
    creativeId: creativeResult.id,
  })
  if (!newAdResult.ok) return { ok: false, reason: newAdResult.error }

  // El anuncio nuevo ya está ACTIVE y confirmado — recién ahora se paga el
  // riesgo de pausar el viejo. Si esto falla, quedan los dos activos en
  // paralelo (no ideal, pero nunca peor que quedarse sin ninguno).
  await graphPost(ad.id, token, { status: 'PAUSED' })

  await supabase
    .from('library_creatives')
    .update({
      status: 'in_use',
      deployed_ad_id: newAdResult.id,
      deployed_at: new Date().toISOString(),
      meta_image_hash: imageHash,
      meta_video_id: videoId,
    })
    .eq('id', asset.id)

  return { ok: true, newAdId: newAdResult.id, creativeName: asset.name }
}

/** No relanza: un email que falla no debe tirar abajo una corrida que ya actuó de verdad sobre la cuenta. Sin RESEND_API_KEY cargada, simplemente no manda nada (las notificaciones pueden estar "activas" en la UI antes de que el usuario complete el setup del proveedor). */
async function sendSummaryEmail(to: string, actions: string[]) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Gotix Autopiloto <onboarding@resend.dev>',
        to: [to],
        subject: `Autopiloto actuó ${actions.length} ${actions.length === 1 ? 'vez' : 'veces'} en tu cuenta`,
        html: `<p>El Autopiloto de Gotix tomó las siguientes acciones:</p><ul>${actions.map((a) => `<li>${a}</li>`).join('')}</ul>`,
      }),
    })
  } catch {
    // silencioso a propósito — ver comentario arriba.
  }
}

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const authHeader = req.headers.get('Authorization')
  const role = decodeJwtRole(authHeader)

  let body: { campaignId?: string; organizationId?: string } = {}
  try {
    body = await req.json()
  } catch {
    // pg_cron manda body vacío — no es un error.
  }

  let scopeOrgId: string | null = null
  let scopeCampaignId: string | null = null

  if (role === 'service_role') {
    // corrida completa sin acotar — pg_cron.
  } else if (role === 'authenticated') {
    if (!body.organizationId || !body.campaignId) {
      return json({ error: 'Falta organizationId o campaignId para una corrida acotada.' }, 400)
    }
    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader! } },
    })
    const { data: userRes, error: userErr } = await anon.auth.getUser()
    if (userErr || !userRes?.user) return json({ error: 'Sesión inválida.' }, 401)

    const { data: membership } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('user_id', userRes.user.id)
      .eq('organization_id', body.organizationId)
      .maybeSingle()
    if (!membership) return json({ error: 'No pertenecés a esta organización.' }, 403)

    scopeOrgId = body.organizationId
    scopeCampaignId = body.campaignId
  } else {
    return json({ error: 'No autorizado.' }, 401)
  }

  const scoped = scopeOrgId !== null

  let settingsQuery = supabase.from('autopilot_playbook_settings').select('*').eq('enabled', true)
  if (scoped) settingsQuery = settingsQuery.eq('organization_id', scopeOrgId!).eq('campaign_id', scopeCampaignId!)
  const { data: settings, error: settingsErr } = await settingsQuery
  if (settingsErr) return json({ error: settingsErr.message }, 500)

  // Solo reglas con campaign_id explícito — la única UI que las crea
  // (autopilot-panel.tsx) siempre las ata a una campaña puntual, nunca a
  // "toda la cuenta" (campaign_id null), así que evaluar ese caso hoy
  // exigiría traer el listado completo de campañas de Meta sin que exista
  // ninguna fila real que lo necesite todavía.
  let rulesQuery = supabase.from('autopilot_custom_rules').select('*').eq('active', true).not('campaign_id', 'is', null)
  if (scoped) rulesQuery = rulesQuery.eq('organization_id', scopeOrgId!).eq('campaign_id', scopeCampaignId!)
  const { data: rules, error: rulesErr } = await rulesQuery
  if (rulesErr) return json({ error: rulesErr.message }, 500)

  if (!settings?.length && !rules?.length) {
    return json({
      ok: true,
      processed: 0,
      reason: scoped ? 'Esta campaña no tiene playbooks ni reglas activas.' : 'no playbooks/rules enabled',
    })
  }

  type CampaignBucket = { playbooks: NonNullable<typeof settings>; rules: NonNullable<typeof rules> }
  const byOrg = new Map<string, Map<string, CampaignBucket>>()

  function bucketFor(organizationId: string, campaignId: string): CampaignBucket {
    if (!byOrg.has(organizationId)) byOrg.set(organizationId, new Map())
    const byCampaign = byOrg.get(organizationId)!
    if (!byCampaign.has(campaignId)) byCampaign.set(campaignId, { playbooks: [], rules: [] })
    return byCampaign.get(campaignId)!
  }

  for (const s of settings ?? []) bucketFor(s.organization_id, s.campaign_id).playbooks.push(s)
  for (const r of rules ?? []) bucketFor(r.organization_id, r.campaign_id!).rules.push(r)

  let totalActions = 0
  const scopedActionsLog: string[] = []

  for (const [organizationId, byCampaign] of byOrg) {
    let orgActionCount = 0
    const orgActionsForNotify: string[] = []

    const { data: conn } = await supabase
      .from('meta_connections')
      .select('token, account_id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!conn?.token || !conn?.account_id) continue
    const token = conn.token as string
    const accountId = (conn.account_id as string).replace(/^act_/, '')

    const { data: orgTargetDefault } = await supabase
      .from('campaign_targets')
      .select('target_cpa, target_roas')
      .eq('organization_id', organizationId)
      .is('campaign_id', null)
      .maybeSingle()

    const { data: notifSettings } = await supabase
      .from('organization_notification_settings')
      .select('email, enabled')
      .eq('organization_id', organizationId)
      .maybeSingle()

    // ── Salud de la conexión — una sola llamada liviana por organización,
    // antes de recorrer campañas. Antes, un token vencido o un rate limit
    // hacía fallar cada graphGet/graphPost de la corrida en silencio (los
    // `if (data.error) continue` de más abajo) sin dejar ningún rastro: el
    // Autopiloto se apagaba para toda la cuenta sin que nadie se enterara.
    // Ahora se detecta acá una sola vez, se deja una entrada visible en
    // "Actividad reciente" (dispara el email resumen si está prendido) y se
    // salta el resto de esta organización en esta corrida — total, cualquier
    // otra llamada iba a fallar igual con el mismo token.
    const health = await graphGet(`act_${accountId}`, token, { fields: 'name' })
    const healthErrorClass = classifyGraphError(health)
    const connectionBroken = healthErrorClass === 'auth' || healthErrorClass === 'rate_limit'

    if (connectionBroken) {
      const since = new Date()
      since.setHours(0, 0, 0, 0)
      const { data: alreadyLogged } = await supabase
        .from('autopilot_run_log')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('entity_id', accountId)
        .eq('action', 'error')
        .gte('created_at', since.toISOString())
        .limit(1)

      // firstCampaignId es solo el portador del campaign_id NOT NULL de la
      // fila — el problema es de la cuenta completa, no de esa campaña en
      // particular (por eso campaign_name queda null: el mensaje ya aclara
      // que es un problema de conexión, no de esa campaña puntual).
      const firstCampaignId = byCampaign.keys().next().value as string | undefined

      if (!alreadyLogged?.length && firstCampaignId) {
        const message =
          healthErrorClass === 'auth'
            ? 'No pudimos conectar con Meta Ads — el token de acceso parece vencido o fue revocado. Reconectá la cuenta en Meta Ads → Conexiones para que el Autopiloto vuelva a actuar.'
            : 'Meta Ads devolvió un límite de uso (rate limit) — el Autopiloto va a reintentar automáticamente en la próxima corrida.'

        await supabase.from('autopilot_run_log').insert({
          organization_id: organizationId,
          campaign_id: firstCampaignId,
          campaign_name: null,
          entity_type: 'campaign',
          entity_id: accountId,
          entity_name: null,
          action: 'error',
          message,
        })
        orgActionsForNotify.push(message)
      }
    }

    for (const [campaignId, bucket] of byCampaign) {
      if (connectionBroken) break
      if (orgActionCount >= MAX_ACTIONS_PER_ORG_PER_RUN) break

      const { data: override } = await supabase
        .from('campaign_targets')
        .select('target_cpa, target_roas')
        .eq('organization_id', organizationId)
        .eq('campaign_id', campaignId)
        .maybeSingle()

      const targets = {
        targetCpa: override?.target_cpa ?? orgTargetDefault?.target_cpa ?? 18,
        targetRoas: override?.target_roas ?? orgTargetDefault?.target_roas ?? 2,
      }

      let campaignName: string | null = null
      try {
        const campData = await graphGet(campaignId, token, { fields: 'name' })
        campaignName = typeof campData?.name === 'string' ? campData.name : null
      } catch {
        campaignName = null
      }

      async function alreadyActedToday(entityId: string, action: string) {
        const since = new Date()
        since.setHours(0, 0, 0, 0)
        const { data } = await supabase
          .from('autopilot_run_log')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('entity_id', entityId)
          .eq('action', action)
          .gte('created_at', since.toISOString())
          .limit(1)
        return (data?.length ?? 0) > 0
      }

      async function logAction(entry: {
        entityType: 'campaign' | 'adset' | 'ad'
        entityId: string
        entityName: string | null
        playbookType?: string | null
        ruleId?: string | null
        action: string
        message: string
      }) {
        await supabase.from('autopilot_run_log').insert({
          organization_id: organizationId,
          campaign_id: campaignId,
          campaign_name: campaignName,
          entity_type: entry.entityType,
          entity_id: entry.entityId,
          entity_name: entry.entityName,
          playbook_type: entry.playbookType ?? null,
          rule_id: entry.ruleId ?? null,
          action: entry.action,
          message: entry.message,
        })
        totalActions++
        orgActionCount++
        orgActionsForNotify.push(entry.message)
        if (scoped) scopedActionsLog.push(entry.message)
      }

      for (const setting of bucket.playbooks) {
        if (orgActionCount >= MAX_ACTIONS_PER_ORG_PER_RUN) break
        const params = (setting.params ?? {}) as Record<string, number>

        // ── Stop-Loss / Guardián — nivel anuncio ──────────────────────────
        if (setting.playbook_type === 'stop_loss') {
          const maxSpendNoAtc = params.maxSpendNoAtc ?? 30
          const { since, until } = dateRange(7)
          const adsData = await graphGet(`${campaignId}/ads`, token, {
            fields: `id,name,effective_status,insights.time_range({"since":"${since}","until":"${until}"}){spend,impressions,ctr,cpm,cpc,frequency,inline_link_clicks,action_values,actions,video_play_actions}`,
            limit: '200',
          })
          if (adsData.error) continue

          for (const ad of adsData.data ?? []) {
            if (ad.effective_status !== 'ACTIVE') continue
            if (orgActionCount >= MAX_ACTIONS_PER_ORG_PER_RUN) break
            const m = computeMetrics(ad.insights?.data?.[0])
            if (m.spend < maxSpendNoAtc) continue

            if (m.addToCart === 0) {
              if (await alreadyActedToday(ad.id, 'pause')) continue
              const res = await graphPost(ad.id, token, { status: 'PAUSED' })
              if (!res.error) {
                await logAction({
                  entityType: 'ad',
                  entityId: ad.id,
                  entityName: ad.name,
                  playbookType: 'stop_loss',
                  action: 'pause',
                  message: `Se pausó "${ad.name}" — gastó $${m.spend.toFixed(0)} sin Agregar al Carrito.`,
                })
              }
            } else if (m.purchases === 0) {
              if (await alreadyActedToday(ad.id, 'notify')) continue
              await logAction({
                entityType: 'ad',
                entityId: ad.id,
                entityName: ad.name,
                playbookType: 'stop_loss',
                action: 'notify',
                message: `"${ad.name}" tiene Agregar al Carrito pero cero compras tras $${m.spend.toFixed(0)} — revisá el checkout, no es problema del anuncio.`,
              })
            }
          }
        }

        // ── Escalado Automático — nivel conjunto ──────────────────────────
        if (setting.playbook_type === 'scale_budget') {
          const increasePct = Math.min(params.increasePct ?? 20, MAX_BUDGET_INCREASE_PCT)
          const minConsecutiveDays = params.minConsecutiveDays ?? 3
          const { since, until } = dateRange(minConsecutiveDays + 2)
          const adsetsData = await graphGet(`${campaignId}/adsets`, token, {
            fields: `id,name,effective_status,daily_budget,insights.time_range({"since":"${since}","until":"${until}"}).time_increment(1){spend,action_values}`,
            limit: '200',
          })
          if (adsetsData.error) continue

          for (const adset of adsetsData.data ?? []) {
            if (adset.effective_status !== 'ACTIVE' || !adset.daily_budget) continue
            if (orgActionCount >= MAX_ACTIONS_PER_ORG_PER_RUN) break

            const days: GraphInsight[] = (adset.insights?.data ?? []).slice(-minConsecutiveDays)
            if (days.length < minConsecutiveDays) continue

            const allEscalar = days.every((day) => {
              const m = computeMetrics(day)
              return m.roas >= targets.targetRoas
            })
            if (!allEscalar) continue

            if (await alreadyActedToday(adset.id, 'increase_budget')) continue

            const currentBudget = Number(adset.daily_budget)
            const nextBudget = Math.round(currentBudget * (1 + increasePct / 100))
            const res = await graphPost(adset.id, token, { daily_budget: String(nextBudget) })
            if (!res.error) {
              await logAction({
                entityType: 'adset',
                entityId: adset.id,
                entityName: adset.name,
                playbookType: 'scale_budget',
                action: 'increase_budget',
                message: `Presupuesto de "${adset.name}" subido ${increasePct}% — ROAS ≥ ${targets.targetRoas.toFixed(2)}x sostenido ${minConsecutiveDays} días seguidos.`,
              })
            }
          }
        }

        // ── Anti-Fatiga — nivel anuncio. Detecta fatiga real y ahora sí
        // rota de verdad (Biblioteca de Ads, 2026-07-24): si hay un
        // creativo disponible, despliega un anuncio nuevo y pausa el
        // fatigado; si no hay ninguno, cae al mismo aviso de siempre. ──
        if (setting.playbook_type === 'anti_fatigue') {
          const ctrDropPct = params.ctrDropPct ?? 25
          const maxFrequency = params.maxFrequency ?? 3.5
          const { since, until } = dateRange(14)
          const adsData = await graphGet(`${campaignId}/ads`, token, {
            fields: `id,name,effective_status,insights.time_range({"since":"${since}","until":"${until}"}).time_increment(1){spend,impressions,ctr,frequency}`,
            limit: '200',
          })
          if (adsData.error) continue

          for (const ad of adsData.data ?? []) {
            if (ad.effective_status !== 'ACTIVE') continue
            if (orgActionCount >= MAX_ACTIONS_PER_ORG_PER_RUN) break

            const dailyInsights: GraphInsight[] = ad.insights?.data ?? []
            if (dailyInsights.length < 6) continue

            const midpoint = Math.floor(dailyInsights.length / 2)
            const earlier = dailyInsights.slice(0, midpoint)
            const recent = dailyInsights.slice(midpoint)
            const avgCtr = (rows: GraphInsight[]) => rows.reduce((sum, r) => sum + Number(r.ctr ?? 0), 0) / rows.length
            const earlierCtr = avgCtr(earlier)
            const recentCtr = avgCtr(recent)
            const lastFrequency = Number(dailyInsights[dailyInsights.length - 1]?.frequency ?? 0)

            const ctrDropped = earlierCtr > 0 && (earlierCtr - recentCtr) / earlierCtr >= ctrDropPct / 100
            const overFrequency = lastFrequency >= maxFrequency

            if (!ctrDropped && !overFrequency) continue

            const reason = ctrDropped
              ? `el CTR cayó ${Math.round(((earlierCtr - recentCtr) / earlierCtr) * 100)}% en los últimos ${dailyInsights.length} días`
              : `la Frecuencia llegó a ${lastFrequency.toFixed(2)}`

            if (await alreadyActedToday(ad.id, 'rotate_creative')) continue

            const rotation = await attemptCreativeRotation(supabase, token, accountId, organizationId, { id: ad.id, name: ad.name })

            if (rotation.ok) {
              await logAction({
                entityType: 'ad',
                entityId: ad.id,
                entityName: ad.name,
                playbookType: 'anti_fatigue',
                action: 'rotate_creative',
                message: `"${ad.name}" estaba fatigando (${reason}) — se rotó con "${rotation.creativeName}" de la Biblioteca, el anuncio anterior quedó pausado.`,
              })
            } else {
              if (await alreadyActedToday(ad.id, 'notify')) continue
              await logAction({
                entityType: 'ad',
                entityId: ad.id,
                entityName: ad.name,
                playbookType: 'anti_fatigue',
                action: 'notify',
                message: `"${ad.name}" está fatigando (${reason}) — no se pudo rotar automáticamente (${rotation.reason}).`,
              })
            }
          }
        }
      }

      // ── Reglas personalizadas — modo Avanzado ────────────────────────────
      for (const rule of bucket.rules) {
        if (orgActionCount >= MAX_ACTIONS_PER_ORG_PER_RUN) break
        const conditions = (rule.conditions ?? []) as RuleCondition[]
        if (!conditions.length) continue
        const ruleParams = (rule.params ?? {}) as RuleParams
        const { since, until } = dateRange(rule.window_days || 7)

        if (rule.action === 'pause' || rule.action === 'notify') {
          const adsData = await graphGet(`${campaignId}/ads`, token, {
            fields: `id,name,effective_status,insights.time_range({"since":"${since}","until":"${until}"}){spend,impressions,ctr,cpm,cpc,frequency,inline_link_clicks,action_values,actions,video_play_actions}`,
            limit: '200',
          })
          if (adsData.error) continue

          for (const ad of adsData.data ?? []) {
            if (ad.effective_status !== 'ACTIVE') continue
            if (orgActionCount >= MAX_ACTIONS_PER_ORG_PER_RUN) break
            const m = computeMetrics(ad.insights?.data?.[0])
            if (m.spend < Number(rule.min_spend)) continue
            if (!evalConditions(m, conditions)) continue
            if (await alreadyActedToday(ad.id, rule.action)) continue

            if (rule.action === 'pause') {
              const res = await graphPost(ad.id, token, { status: 'PAUSED' })
              if (res.error) continue
            }

            await logAction({
              entityType: 'ad',
              entityId: ad.id,
              entityName: ad.name,
              ruleId: rule.id,
              action: rule.action,
              message: `Regla "${rule.name}": ${rule.action === 'pause' ? 'se pausó' : 'se detectó'} "${ad.name}" — ${describeConditions(conditions)}.`,
            })
          }
        } else {
          // reduce_budget / increase_budget — nivel conjunto, agregado sobre
          // la ventana completa (no día por día como scale_budget, las
          // reglas custom son de un solo corte, no de sostenimiento).
          const adsetsData = await graphGet(`${campaignId}/adsets`, token, {
            fields: `id,name,effective_status,daily_budget,insights.time_range({"since":"${since}","until":"${until}"}){spend,impressions,ctr,cpm,cpc,frequency,inline_link_clicks,action_values,actions,video_play_actions}`,
            limit: '200',
          })
          if (adsetsData.error) continue

          for (const adset of adsetsData.data ?? []) {
            if (adset.effective_status !== 'ACTIVE' || !adset.daily_budget) continue
            if (orgActionCount >= MAX_ACTIONS_PER_ORG_PER_RUN) break
            const m = computeMetrics(adset.insights?.data?.[0])
            if (m.spend < Number(rule.min_spend)) continue
            if (!evalConditions(m, conditions)) continue
            if (await alreadyActedToday(adset.id, rule.action)) continue

            const cap = rule.action === 'increase_budget' ? MAX_BUDGET_INCREASE_PCT : MAX_BUDGET_DECREASE_PCT
            const changePct = Math.min(Math.abs(ruleParams.budgetChangePct ?? 20), cap)
            const currentBudget = Number(adset.daily_budget)
            const nextBudget =
              rule.action === 'increase_budget'
                ? Math.round(currentBudget * (1 + changePct / 100))
                : Math.round(currentBudget * (1 - changePct / 100))
            const res = await graphPost(adset.id, token, { daily_budget: String(nextBudget) })
            if (res.error) continue

            await logAction({
              entityType: 'adset',
              entityId: adset.id,
              entityName: adset.name,
              ruleId: rule.id,
              action: rule.action,
              message: `Regla "${rule.name}": presupuesto de "${adset.name}" ${rule.action === 'increase_budget' ? 'subido' : 'bajado'} ${changePct}% — ${describeConditions(conditions)}.`,
            })
          }
        }
      }
    }

    if (orgActionsForNotify.length > 0 && notifSettings?.enabled && notifSettings.email) {
      await sendSummaryEmail(notifSettings.email, orgActionsForNotify)
    }
  }

  return json({
    ok: true,
    processed: totalActions,
    ...(scoped
      ? {
          actions: scopedActionsLog,
          message: scopedActionsLog.length
            ? undefined
            : 'Se evaluaron los playbooks y reglas activas de esta campaña — ninguna condición se cumplió en este momento.',
        }
      : {}),
  })
})
