'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { getMetaCampaigns } from '@/lib/meta/campaigns'
import { askAI } from '@/lib/ia/client'
import { checkIaUsage, incrementIaUsage } from '@/lib/ia/usage'
import { arDateKey } from '@/lib/argentina-time'

// Puerto de app.html:8831+ (dmGenerar) — agrega spend/revenue/ROAS del mes,
// acciones del Autopiloto, guiones ganadores, y le pide a la IA que
// redacte la narrativa breve. Una entrada por mes (unique en la tabla) —
// "Generar" hace upsert, así que correrlo de nuevo el mismo mes actualiza
// la entrada existente en vez de duplicarla.

export async function generateBrandJournalEntryAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return { ok: false, error: 'No encontramos tu organización activa.' }

  const supabase = await createClient()

  const usage = await checkIaUsage(supabase, activeOrganizationId)
  if (!usage.allowed) {
    return {
      ok: false,
      error: `Llegaste al límite de ${usage.limit} consultas de IA este mes en tu plan actual.`,
    }
  }

  // Fechas en hora argentina (el servidor corre en UTC).
  const todayKey = arDateKey(new Date())
  const monthKey = `${todayKey.slice(0, 7)}-01`
  const monthStart = new Date(`${monthKey}T00:00:00-03:00`)
  const dayOfMonth = Number(todayKey.slice(8, 10))
  const daysInMonth = new Date(Number(todayKey.slice(0, 4)), Number(todayKey.slice(5, 7)), 0).getDate()
  const daysIntoMonth = Math.max(1, dayOfMonth)
  const monthClosed = dayOfMonth === daysInMonth

  const { data: connection } = await supabase
    .from('meta_connections')
    .select('token, account_id, account_currency')
    .eq('organization_id', activeOrganizationId)
    .maybeSingle()

  let totalSpend = 0
  let totalRevenue = 0
  let activeCampaigns = 0
  if (connection) {
    const result = await getMetaCampaigns(connection.token, connection.account_id, daysIntoMonth)
    if (result.ok) {
      activeCampaigns = result.campaigns.filter((c) => c.effectiveStatus === 'ACTIVE').length
      totalSpend = result.campaigns.reduce((sum, c) => sum + c.spend, 0)
      totalRevenue = result.campaigns.reduce((sum, c) => sum + c.revenue, 0)
    }
  }
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0

  const { count: autopilotActions } = await supabase
    .from('autopilot_run_log')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', activeOrganizationId)
    .gte('created_at', monthStart.toISOString())

  const { data: winningScripts } = await supabase
    .from('scripts')
    .select('title')
    .eq('organization_id', activeOrganizationId)
    .eq('status', 'ganador')
    .limit(10)

  const [{ data: profile }, { data: organization }] = await Promise.all([
    supabase.from('business_profile').select('brand_name, tono').eq('organization_id', activeOrganizationId).maybeSingle(),
    supabase.from('organizations').select('name').eq('id', activeOrganizationId).maybeSingle(),
  ])
  const currency = connection?.account_currency === 'ARS' ? 'ARS' : 'USD'
  const moneyPrefix = currency === 'ARS' ? '$' : 'US$'

  const stats = {
    spend: Math.round(totalSpend),
    revenue: Math.round(totalRevenue),
    roas: Math.round(roas * 100) / 100,
    activeCampaigns,
    autopilotActions: autopilotActions ?? 0,
    winningScripts: (winningScripts ?? []).map((s) => s.title),
    currency,
  }

  const monthLabel = new Date(`${monthKey}T12:00:00`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const periodLine = monthClosed
    ? `mes de ${monthLabel} (cerrado)`
    : `mes de ${monthLabel}, EN CURSO: van ${dayOfMonth} de ${daysInMonth} días, así que no digas que el mes cerró`
  const scriptsLine = stats.winningScripts.length
    ? `Guiones ganadores del período: ${stats.winningScripts.join(', ')}.`
    : 'Sin guiones marcados como ganadores todavía.'

  const prompt = `Escribí un resumen breve (2-3 párrafos cortos) en español rioplatense, tono ${
    profile?.tono || 'directo, sin vueltas'
  }, para el diario de marca de ${
    profile?.brand_name || organization?.name || 'la marca'
  }, ${periodLine}. Datos reales del período (montos en ${currency === 'ARS' ? 'pesos' : 'dólares'}): gasto en Meta Ads ${moneyPrefix}${stats.spend}, ventas atribuidas por Meta ${moneyPrefix}${stats.revenue}, ROAS ${
    stats.roas
  }x, ${stats.activeCampaigns} campañas activas, el Autopiloto tomó ${stats.autopilotActions} acciones automáticas. ${scriptsLine} Contá esto como una narrativa breve, no una lista — qué pasó, cómo viene el mes, sin inventar datos que no te di.`

  const result = await askAI(
    'Sos un redactor que arma resúmenes ejecutivos breves y concretos para el diario de marca de un negocio de e-commerce.',
    [{ role: 'user', content: prompt }]
  )
  if (!result.ok) return result

  await incrementIaUsage(supabase, activeOrganizationId)

  const { error } = await supabase.from('brand_journal_entries').upsert(
    { organization_id: activeOrganizationId, month: monthKey, narrative: result.reply, stats },
    { onConflict: 'organization_id,month' }
  )
  if (error) return { ok: false, error: 'No pudimos guardar la entrada. Probá de nuevo.' }

  revalidatePath('/intelligence/brand-journal')
  return { ok: true }
}
