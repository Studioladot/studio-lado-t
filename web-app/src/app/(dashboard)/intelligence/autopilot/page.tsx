import { redirect } from 'next/navigation'

// El Autopiloto real vive en Meta Ads (playbooks, reglas custom, kill
// switch, notificaciones, log — construido 2026-07-24/25). Esta entrada de
// Inteligencia era el mismo concepto en el legado (app.html:2994-3050,
// "Autopiloto de Rentabilidad") — no se duplica, se redirige al hub real.
export default function IntelligenceAutopilotPage() {
  redirect('/meta-ads/profitability')
}
