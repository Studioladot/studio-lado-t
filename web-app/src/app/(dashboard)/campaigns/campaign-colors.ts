// Paleta acotada de colores de campaña — fuente única de verdad (limpieza
// de cierre de Fase 1, 2026-08-06). Antes vivía solo en campaign-form.tsx;
// el detalle de campaña (campaign-details-form.tsx) necesitaba la misma
// paleta para poder EDITAR el color después de creada la campaña, y el
// fallback '#4C7EFF' estaba repetido a mano en campaigns/page.tsx y
// content/unified-items.ts.

export const CAMPAIGN_COLORS = ['#4C7EFF', '#7C5CFC', '#E0637D', '#E08A3C', '#3EBA85', '#34B3C2', '#8B93A3']

export const DEFAULT_CAMPAIGN_COLOR = CAMPAIGN_COLORS[0]
