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

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_SALES: 'Ventas',
  OUTCOME_TRAFFIC: 'Tráfico',
  OUTCOME_ENGAGEMENT: 'Interacción/Mensajes',
  OUTCOME_LEADS: 'Clientes potenciales',
  OUTCOME_AWARENESS: 'Reconocimiento',
  OUTCOME_APP_PROMOTION: 'Promoción de app',
}

export async function buildSystemPrompt(
  supabase: SupabaseClient,
  organizationId: string,
  meta: { token: string; accountId: string; currency?: string | null } | null
): Promise<string> {
  const { data: profile } = await supabase
    .from('business_profile')
    .select('brand_name, rubro, tono, breakeven_roas, margen_bruto_objetivo, experto1_nombre, experto1_rol, experto2_nombre, experto2_rol')
    .eq('organization_id', organizationId)
    .maybeSingle()

  const nombreMarca = profile?.brand_name || 'tu marca'
  const rubro = profile?.rubro || 'e-commerce'
  const tono = profile?.tono || 'directo, sin vueltas'
  // Antes se inventaban 2x y 48% cuando no estaban cargados, y la IA los
  // tomaba como datos reales del negocio.
  const breakevenLine = profile?.breakeven_roas ? `Breakeven ROAS de referencia: ${profile.breakeven_roas}x. ` : ''
  const margenLine = profile?.margen_bruto_objetivo ? `Margen bruto objetivo: ${profile.margen_bruto_objetivo}%. ` : ''

  let expertos = ''
  if (profile?.experto1_nombre || profile?.experto2_nombre) {
    expertos = '\nTenés puesta la cabeza de estas personas — combiná sus criterios según la pregunta, y aclará desde qué mirada estás respondiendo cuando sea relevante:\n'
    if (profile.experto1_nombre) expertos += `- ${profile.experto1_nombre}: experto en ${profile.experto1_rol || 'la operación del negocio'}.\n`
    if (profile.experto2_nombre) expertos += `- ${profile.experto2_nombre}: experta en ${profile.experto2_rol || 'comunicación'}.\n`
  }

  const ctx = await buildBusinessContext(supabase, organizationId, meta)

  return `Sos el asistente estratégico de ${nombreMarca} (rubro: ${rubro}). ${breakevenLine}${margenLine}Tono de comunicación: ${tono}.
${expertos}
Respondé en español rioplatense, sin preámbulo. Si los datos de abajo no alcanzan para responder con precisión, decilo y pedí el dato exacto en vez de generalizar. Evaluá cada campaña según su objetivo: una de Tráfico se mide por CPC y CTR, una de Interacción o Mensajes por costo por resultado, y solo las de Ventas por ROAS y CPA.

${ctx}`
}

async function buildBusinessContext(
  supabase: SupabaseClient,
  organizationId: string,
  meta: { token: string; accountId: string; currency?: string | null } | null
): Promise<string> {
  const parts: string[] = []

  if (meta) {
    const result = await getMetaCampaigns(meta.token, meta.accountId, 14)
    if (result.ok) {
      const activas = result.campaigns.filter((c) => c.effectiveStatus === 'ACTIVE').slice(0, 6)
      if (activas.length) {
        parts.push(
          'Campañas activas (últimos 14 días): ' +
            activas
              .map((c) => {
                const money = (n: number) => `${meta.currency === 'ARS' ? '$' : 'US$'}${n.toFixed(2)}`
                const objetivo = OBJECTIVE_LABELS[c.objective] ?? c.objective
                const ventas = c.purchases > 0 ? `, ${c.purchases} compras, CPA ${money(c.cpa)}, ROAS ${c.roas.toFixed(2)}x` : ', sin compras'
                return `${c.name} [objetivo: ${objetivo}] (gasto ${money(c.spend)}${ventas}, CTR ${c.ctr.toFixed(2)}%, CPC ${money(c.cpc)})`
              })
              .join('; ') +
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
