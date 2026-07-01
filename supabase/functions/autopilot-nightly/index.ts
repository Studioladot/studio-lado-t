import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

Deno.serve(async (req) => {
  // Supabase llama esta función con el service role internamente
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Traer todas las reglas activas con sus usuarios y tokens de Meta
  const { data: rules, error: rulesErr } = await supabase
    .from('autopilot_rules')
    .select('*, user:user_id(id)')
    .eq('active', true)

  if (rulesErr) return new Response(JSON.stringify({ error: rulesErr.message }), { status: 500 })
  if (!rules?.length) return new Response(JSON.stringify({ ok: true, processed: 0 }))

  // Agrupar reglas por user_id para hacer una sola llamada a Meta por usuario
  const byUser = rules.reduce((acc: Record<string, typeof rules>, rule) => {
    const uid = rule.user_id
    if (!acc[uid]) acc[uid] = []
    acc[uid].push(rule)
    return acc
  }, {})

  let totalActions = 0

  for (const [userId, userRules] of Object.entries(byUser)) {
    // Obtener token de Meta y account_id del usuario
    const { data: conn } = await supabase
      .from('meta_connections')
      .select('token, account_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!conn?.token || !conn?.account_id) continue

    const accountId = String(conn.account_id).replace(/^act_/, '')
    const token = conn.token

    // Procesar cada regla del usuario
    for (const rule of userRules as any[]) {
      const windowDays = rule.window_days || 7
      const until = new Date()
      const since = new Date(Date.now() - windowDays * 86400000)
      const fmt = (d: Date) => d.toISOString().split('T')[0]

      // Traer anuncios activos con insights
      const adsUrl = new URL(`${GRAPH_BASE}/act_${accountId}/ads`)
      adsUrl.searchParams.set('access_token', token)
      adsUrl.searchParams.set('fields', `id,name,effective_status,insights.time_range({"since":"${fmt(since)}","until":"${fmt(until)}"}){spend,action_values,actions,impressions,cpc}`)
      adsUrl.searchParams.set('limit', '200')

      const adsRes = await fetch(adsUrl)
      const adsData = await adsRes.json()
      if (adsData.error) continue

      const conditions = rule.conditions || []
      if (!conditions.length) continue

      for (const ad of (adsData.data || [])) {
        if (ad.effective_status !== 'ACTIVE') continue
        const ins = ad.insights?.data?.[0] || {}
        const spend = +(ins.spend || 0)
        if (spend < (rule.min_spend || 0)) continue

        // Evaluar condiciones
        const metrics: Record<string, number> = {
          roas: (() => { const s=spend,r=+(ins.action_values?.find((a:any)=>a.action_type==='purchase')?.value||0); return s>0&&r>0?r/s:0 })(),
          cpa:  (() => { const s=spend,p=+(ins.actions?.find((a:any)=>a.action_type==='purchase')?.value||0); return p>0?s/p:0 })(),
          spend,
          purchases: +(ins.actions?.find((a:any)=>a.action_type==='purchase')?.value||0),
          cpc: +(ins.cpc||0)
        }

        const failedConds = conditions.filter((c: any) => {
          const val = metrics[c.metric] ?? 0
          if (c.op === 'lt') return val < c.value
          if (c.op === 'gt') return val > c.value
          if (c.op === 'eq') return Math.abs(val - c.value) < 0.001
          return false
        })

        if (failedConds.length !== conditions.length) continue // AND logic: todas deben fallar

        // Ejecutar acción
        const motivoStr = failedConds.map((c: any) => `${c.metric} ${c.op} ${c.value}`).join(' | ')
        let logMsg = ''

        if (rule.action === 'pause') {
          const pauseRes = await fetch(`${GRAPH_BASE}/${ad.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ status: 'PAUSED', access_token: token })
          })
          const pauseData = await pauseRes.json()
          if (!pauseData.error) {
            logMsg = `[Autopiloto nocturno] Se pausó "${ad.name}" — ${motivoStr}`
            totalActions++
          }
        } else if (rule.action === 'notify') {
          logMsg = `[Autopiloto nocturno] Alerta: "${ad.name}" — ${motivoStr}`
          totalActions++
        }

        if (logMsg) {
          await supabase.from('autopilot_log').insert({
            user_id: userId,
            action: rule.action,
            message: logMsg,
            ad_id: ad.id,
            ad_name: ad.name,
            rule_id: rule.id
          })
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: totalActions }))
})
