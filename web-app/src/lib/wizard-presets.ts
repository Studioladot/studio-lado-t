export type WizardPreset = {
  id: string
  name: string
  createdAt: string
  objective: string
  budgetMode: 'cbo' | 'abo'
  dailyBudget: number
  bidStrategy: string
  bidAmount: string
  placementsMode: 'automatic' | 'manual'
  pixelId: string
  pageId: string
  productUrl: string
}

const STORAGE_KEY = 'gotix_wizard_presets_v1'

export function loadPresets(): WizardPreset[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as WizardPreset[]) : []
  } catch {
    return []
  }
}

export function savePreset(preset: WizardPreset) {
  const presets = loadPresets().filter((p) => p.id !== preset.id)
  presets.unshift(preset)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

export function deletePreset(id: string) {
  const presets = loadPresets().filter((p) => p.id !== id)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}
