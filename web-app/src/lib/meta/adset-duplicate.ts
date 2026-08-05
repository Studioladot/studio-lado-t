import { metaGraphGet, metaGraphPostRaw, type MetaCreateResult } from './graph-client'

// "Duplicación Inteligente de Conjuntos" (2026-08-06) — Feature Killer para
// el Media Buyer: aprovechar el aprendizaje del conjunto (audiencia,
// presupuesto, ubicaciones, optimización) para testear un creativo nuevo,
// sin tener que recrear la configuración a mano ni arrastrar los anuncios
// viejos.
//
// A diferencia de createTestAdSet (lib/meta/ad-launch.ts, arma el
// `targeting` desde cero a partir de la selección del usuario en el
// wizard), acá se lee el `targeting` REAL que Meta ya tiene guardado para
// el conjunto original y se reenvía tal cual — evita reconstruirlo a
// través de nuestro AudienceSpec interno, que perdería matices (public
// personalizado exacto, exclusiones, flexible_spec compuesto, etc.) que
// Meta sí preserva en su propio JSON.
//
// El conjunto nuevo nace SIN ningún anuncio — no hace falta "borrar" los
// viejos, alcanza con no copiarlos nunca: se crea vacío y PAUSADO (nunca
// hereda el estado ACTIVE del original, por seguridad — no tiene sentido
// gastar en un conjunto sin ningún anuncio corriendo todavía).

type RawAdSetConfig = {
  name?: string
  targeting?: Record<string, unknown>
  optimization_goal?: string
  billing_event?: string
  bid_strategy?: string
  bid_amount?: number
  daily_budget?: string
  lifetime_budget?: string
  promoted_object?: Record<string, unknown>
  attribution_spec?: unknown[]
  is_dynamic_creative?: boolean
}

const ADSET_CONFIG_FIELDS =
  'name,targeting,optimization_goal,billing_event,bid_strategy,bid_amount,daily_budget,lifetime_budget,promoted_object,attribution_spec,is_dynamic_creative'

export type DuplicateAdSetResult =
  | { ok: true; newAdSetId: string; newAdSetName: string }
  | { ok: false; error: string }

export async function duplicateMetaAdSetForCreativeTest(
  token: string,
  accountId: string,
  sourceAdSetId: string,
  campaignId: string
): Promise<DuplicateAdSetResult> {
  const cleanAccountId = accountId.replace(/^act_/, '')

  const sourceResult = await metaGraphGet<RawAdSetConfig>(`/${sourceAdSetId}?fields=${ADSET_CONFIG_FIELDS}`, token)
  if (!sourceResult.ok) {
    return { ok: false, error: `No pudimos leer la configuración del conjunto original: ${sourceResult.error}` }
  }
  const source = sourceResult.data

  const newName = `${source.name ?? 'Conjunto'} (Testeo creativos)`

  const body: Record<string, string> = {
    name: newName,
    campaign_id: campaignId,
    // Siempre pausado — nace sin anuncios, no hay nada que mostrar/gastar
    // todavía. El usuario lo activa él mismo una vez que sube el creativo.
    status: 'PAUSED',
  }
  if (source.targeting) body.targeting = JSON.stringify(source.targeting)
  if (source.optimization_goal) body.optimization_goal = source.optimization_goal
  if (source.billing_event) body.billing_event = source.billing_event
  if (source.bid_strategy) body.bid_strategy = source.bid_strategy
  if (source.bid_amount) body.bid_amount = String(source.bid_amount)
  if (source.daily_budget) body.daily_budget = source.daily_budget
  // Meta rechaza el POST si van juntos daily_budget y lifetime_budget.
  else if (source.lifetime_budget) body.lifetime_budget = source.lifetime_budget
  if (source.promoted_object) body.promoted_object = JSON.stringify(source.promoted_object)
  if (source.attribution_spec) body.attribution_spec = JSON.stringify(source.attribution_spec)
  if (source.is_dynamic_creative) body.is_dynamic_creative = 'true'

  const created: MetaCreateResult = await metaGraphPostRaw(`/act_${cleanAccountId}/adsets`, token, body)
  if (!created.ok) {
    return { ok: false, error: `No pudimos crear el conjunto duplicado: ${created.error}` }
  }

  return { ok: true, newAdSetId: created.id, newAdSetName: newName }
}
