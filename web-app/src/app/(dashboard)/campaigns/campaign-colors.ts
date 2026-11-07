// Paleta acotada de colores de campaña — fuente única de verdad (limpieza
// de cierre de Fase 1, 2026-08-06). Antes vivía solo en campaign-form.tsx;
// el detalle de campaña (campaign-details-form.tsx) necesitaba la misma
// paleta para poder EDITAR el color después de creada la campaña, y el
// fallback '#4C7EFF' estaba repetido a mano en campaigns/page.tsx y
// content/unified-items.ts.

// Rebrand GOTIX x LADO T (2026-11-07): arranca por los colores de marca.
export const CAMPAIGN_COLORS = ['#B03311', '#A6C5BB', '#C1543F', '#E3A857', '#2F7360', '#7C5CFC', '#8B93A3']

export const DEFAULT_CAMPAIGN_COLOR = CAMPAIGN_COLORS[0]
