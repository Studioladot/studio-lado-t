import type { SupabaseClient } from '@supabase/supabase-js'
import { getMetaCampaigns } from '@/lib/meta/campaigns'
import { getAllCampaignTargets } from '@/lib/meta/autopilot'

// Puerto de app.html:5691-5710 (buildSystemPrompt) + 5764-5776 (buildCtx).
// Dos diferencias deliberadas del legado: (1) usa campaign_targets
// (CPA/ROAS objetivo/breakeven, el sistema real ya construido en Meta Ads
// esta sesión) en vez de la tabla genérica `objectives`, que no está
// integrada a nada del módulo real; (2) no incluye "cuenta/cliente activo"
// (el legado tenía un selector de contacto CRM) — este chat es sobre el
// negocio de la organización, no por-cliente.
//
// Blindaje de costos (auditoría de Unit Economics, 2026-07-25): la ventana
// de campañas se recortó de 30 a 14 días — nunca se manda el historial
// completo ni los insights crudos de Meta, solo un resumen de una línea
// por campaña (nombre + gasto + ROAS redondeados). Esto es lo que entra al
// prompt cacheado automáticamente del lado de OpenAI en askAI — cuanto más
// chico y estable, mejor pega el caché entre consultas de la misma sesión.

export async function buildSystemPrompt(
  supabase: SupabaseClient,
  organizationId: string,
  meta: { token: string; accountId: string } | null
): Promise<string> {
  const { data: profile } = await supabase
    .from('business_profile')
    .select('brand_name, rubro, tono, breakeven_roas, margen_bruto_objetivo, experto1_nombre, experto1_rol, experto2_nombre, experto2_rol')
    .eq('organization_id', organizationId)
    .maybeSingle()

  const nombreMarca = profile?.brand_name || 'tu marca'
  const rubro = profile?.rubro || 'e-commerce'
  const tono = profile?.tono || 'directo, sin vueltas'
  const breakeven = profile?.breakeven_roas ?? 2
  const margen = profile?.margen_bruto_objetivo ?? 48

  let expertos = ''
  if (profile?.experto1_nombre || profile?.experto2_nombre) {
    expertos = '\nTenés puesta la cabeza de estas personas — combiná sus criterios según la pregunta, y aclará desde qué mirada estás respondiendo cuando sea relevante:\n'
    if (profile.experto1_nombre) expertos += `- ${profile.experto1_nombre}: experto en ${profile.experto1_rol || 'la operación del negocio'}.\n`
    if (profile.experto2_nombre) expertos += `- ${profile.experto2_nombre}: experta en ${profile.experto2_rol || 'comunicación'}.\n`
  }

  const ctx = await buildBusinessContext(supabase, organizationId, meta)

  return `Sos el asistente estratégico de ${nombreMarca} (rubro: ${rubro}). Breakeven ROAS de referencia: ${breakeven}x. Margen bruto objetivo: ${margen}%. Tono de comunicación: ${tono}.
${expertos}
Respondé en español rioplatense, sin preámbulo. Si los datos de abajo no alcanzan para responder con precisión, decilo y pedí el dato exacto en vez de generalizar.

${ctx}`
}

async function buildBusinessContext(
  supabase: SupabaseClient,
  organizationId: string,
  meta: { token: string; accountId: string } | null
): Promise<string> {
  const parts: string[] = []

  if (meta) {
    const result = await getMetaCampaigns(meta.token, meta.accountId, 14)
    if (result.ok) {
      const activas = result.campaigns.filter((c) => c.effectiveStatus === 'ACTIVE').slice(0, 6)
      if (activas.length) {
        parts.push(
          'Campañas activas (últimos 14 días): ' +
            activas.map((c) => `${c.name} (gasto $${Math.round(c.spend)}, ROAS ${c.roas.toFixed(2)}x)`).join(', ') +
            '.'
        )
      }
    }
  }

  const { accountDefault } = await getAllCampaignTargets(supabase, organizationId)
  parts.push(
    `Objetivos de cuenta: CPA objetivo $${accountDefault.targetCpa}, ROAS objetivo ${accountDefault.targetRoas}x, CPA breakeven $${accountDefault.breakEvenCpa}, ROAS breakeven ${accountDefault.breakEvenRoas}x.`
  )

  const { data: scripts } = await supabase
    .from('scripts')
    .select('title')
    .eq('organization_id', organizationId)
    .in('status', ['activo', 'ganador'])
    .limit(10)
  if (scripts?.length) {
    parts.push('Guiones activos/ganadores: ' + scripts.map((s) => s.title).join(', ') + '.')
  }

  return parts.length ? 'DATOS REALES DEL NEGOCIO AHORA MISMO:\n' + parts.map((p) => '- ' + p).join('\n') : '(sin datos cargados todavía para este período)'
}
