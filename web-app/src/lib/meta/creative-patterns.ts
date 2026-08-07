import type { MetaAccountAd } from './campaigns'

// "Análisis Visual Asistido" (2026-08-07, Innovación Radical #1) — versión
// honesta de la idea del usuario ("tus anuncios con calce oversize tienen
// un CPA 30% más bajo"): Gotix no tiene clasificación de imagen (no hay
// visión por computadora en este proyecto), así que en vez de INVENTAR una
// lectura del contenido visual, el patrón se detecta en algo que sí existe
// y ya es 100% real hoy — las palabras que el propio equipo de medios ya
// escribe en el NOMBRE de cada anuncio como parte de su convención de
// naming (ej. "Reel_Oversize_HookA", "IMG_ModeloBlanco_CTA2"). Es el mismo
// principio que Diagnóstico Inteligente en Contenido (director-tip.ts):
// nunca se inventa una correlación sin muestra real, se devuelve null y el
// banner no se muestra.

export type CreativePatternInsight = {
  bestToken: string
  worstToken: string
  bestCpa: number
  worstCpa: number
  cpaDiffPct: number
  bestSample: number
  worstSample: number
}

const MIN_TOKEN_LENGTH = 3
const MIN_SAMPLE_PER_TOKEN = 2
const MIN_CPA_DIFF_PCT = 20

// Palabras genéricas de naming que no describen ningún atributo del
// creativo — filtrarlas evita que "test"/"copia"/"v2" ganen por ser
// frecuentes sin decir nada útil.
const STOPWORDS = new Set([
  'test', 'copia', 'copy', 'anuncio', 'ad', 'ads', 'nuevo', 'nueva', 'final',
  'the', 'and', 'con', 'sin', 'del', 'los', 'las', 'una', 'uno', 'para', 'por',
])

function tokenize(name: string): Set<string> {
  const words = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(w) && !/^\d+$/.test(w))
  return new Set(words)
}

/** `ads` — mismos datos que ya trae getMetaAccountAds (Biblioteca de Ads), sin ningún fetch nuevo. */
export function computeCreativePatternInsight(ads: Pick<MetaAccountAd, 'name' | 'spend' | 'purchases'>[]): CreativePatternInsight | null {
  const byToken = new Map<string, { spend: number; purchases: number; count: number }>()

  for (const ad of ads) {
    if (ad.spend <= 0 || ad.purchases <= 0) continue
    for (const token of tokenize(ad.name)) {
      const entry = byToken.get(token) ?? { spend: 0, purchases: 0, count: 0 }
      entry.spend += ad.spend
      entry.purchases += ad.purchases
      entry.count += 1
      byToken.set(token, entry)
    }
  }

  const groups = [...byToken.entries()]
    .filter(([, g]) => g.count >= MIN_SAMPLE_PER_TOKEN)
    .map(([token, g]) => ({ token, count: g.count, cpa: g.spend / g.purchases }))
    .sort((a, b) => a.cpa - b.cpa)

  if (groups.length < 2) return null

  const best = groups[0]
  const worst = groups[groups.length - 1]
  if (best.token === worst.token || worst.cpa <= 0) return null

  const cpaDiffPct = ((worst.cpa - best.cpa) / worst.cpa) * 100
  if (cpaDiffPct < MIN_CPA_DIFF_PCT) return null

  return {
    bestToken: best.token,
    worstToken: worst.token,
    bestCpa: best.cpa,
    worstCpa: worst.cpa,
    cpaDiffPct,
    bestSample: best.count,
    worstSample: worst.count,
  }
}
