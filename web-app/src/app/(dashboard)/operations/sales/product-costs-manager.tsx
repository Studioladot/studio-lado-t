'use client'

import { useMemo, useState } from 'react'
import { saveProductCostAction, bulkSaveProductCostsAction, deleteProductCostAction } from './actions'
import { ConfirmSubmitButton } from '@/components/features/confirm-submit-button'
import type { ProductCost } from '@/lib/tiendanube/product-costs'
import type { TiendaNubeProductVariant } from '@/lib/tiendanube/products'

// Gestión de Costos en Lote (2026-07-27) — reemplaza product-costs-table.tsx,
// que solo permitía cargar una variante a la vez. Acá el catálogo se agrupa
// por producto (sin fetch nuevo, TiendaNubeProductVariant ya trae productId)
// para poder aplicar el mismo costo a todas las variantes de un producto —
// o de varios a la vez — con un solo guardado (bulkSaveProductCostsAction).
// Selección múltiple con el mismo idioma que ads-workspace.tsx (Set<id> +
// checkbox + toggle). Cada producto tiene un expand para ajustar variantes
// puntuales (ej: una talla con tela distinta) sin perder la carga masiva.

function money(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

const FIELD_CLASS =
  'rounded-control border border-border bg-surface-2/60 px-3 py-2 text-sm text-text outline-none transition-all duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent'

type ProductGroup = {
  productId: number
  productName: string
  imageUrl: string | null
  variants: TiendaNubeProductVariant[]
  sharedCost: number | null
  mixed: boolean
}

function groupCatalog(catalog: TiendaNubeProductVariant[], costMap: Map<number, number>): ProductGroup[] {
  const groups = new Map<number, ProductGroup>()
  for (const v of catalog) {
    let g = groups.get(v.productId)
    if (!g) {
      g = { productId: v.productId, productName: v.productName, imageUrl: v.imageUrl, variants: [], sharedCost: null, mixed: false }
      groups.set(v.productId, g)
    }
    g.variants.push(v)
  }
  for (const g of groups.values()) {
    const costs = g.variants.map((v) => costMap.get(v.variantId))
    const allSet = costs.every((c) => c !== undefined)
    const allSame = allSet && costs.every((c) => c === costs[0])
    g.sharedCost = allSame ? (costs[0] as number) : null
    g.mixed = allSet && !allSame
  }
  return Array.from(groups.values()).sort((a, b) => a.productName.localeCompare(b.productName))
}

/** Mismo criterio que las miniaturas de anuncios en meta-ads (<img> crudo + onerror oculta) — Tienda Nube no siempre tiene imagen cargada por producto. */
function ProductThumbnail({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return <div className="h-9 w-9 shrink-0 rounded-control border border-border bg-surface-2" aria-hidden />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-9 w-9 shrink-0 rounded-control border border-border object-cover"
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  )
}

function VariantFineTuneRow({ variant, initialCost }: { variant: TiendaNubeProductVariant; initialCost: number | undefined }) {
  const [cost, setCost] = useState(initialCost !== undefined ? String(initialCost) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await saveProductCostAction({
      variantId: variant.variantId,
      productId: variant.productId,
      productName: `${variant.productName}${variant.variantName ? ` — ${variant.variantName}` : ''}`,
      cost: Number(cost) || 0,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-control border border-border bg-surface-2/40 px-3 py-1.5">
      <span className="min-w-0 flex-1 truncate text-[11px] text-text-2">
        {variant.variantName ?? 'Única variante'}
        {variant.stock !== null ? ` — stock: ${variant.stock}` : ''}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <input
          type="number"
          min={0}
          step="any"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="0"
          className="w-20 rounded-control border border-border bg-surface px-2 py-1 text-right text-[11px] text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-control border border-accent/30 bg-accent/[0.06] px-2 py-1 text-[10px] font-semibold text-accent transition-all duration-200 ease-out hover:bg-accent/[0.12] disabled:opacity-50"
        >
          {saving ? '…' : saved ? 'Guardado' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

export function ProductCostsManager({ costs, catalog }: { costs: ProductCost[]; catalog: TiendaNubeProductVariant[] }) {
  const costMap = useMemo(() => new Map(costs.map((c) => [c.variantId, c.cost])), [costs])
  const groups = useMemo(() => groupCatalog(catalog, costMap), [catalog, costMap])

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkCost, setBulkCost] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function toggleSelected(productId: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  const selectedGroups = groups.filter((g) => selected.has(g.productId))
  const selectedVariantCount = selectedGroups.reduce((sum, g) => sum + g.variants.length, 0)

  async function handleBulkApply() {
    const cost = Number(bulkCost)
    if (!bulkCost || selectedGroups.length === 0) return

    setSaving(true)
    setError(null)
    setSuccess(null)
    const items = selectedGroups.flatMap((g) =>
      g.variants.map((v) => ({
        variantId: v.variantId,
        productId: v.productId,
        productName: `${v.productName}${v.variantName ? ` — ${v.variantName}` : ''}`,
        cost,
      }))
    )
    const result = await bulkSaveProductCostsAction(items)
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSuccess(`Costo aplicado a ${items.length} variante${items.length === 1 ? '' : 's'}.`)
    setSelected(new Set())
    setBulkCost('')
  }

  if (catalog.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Gestión de Costos</p>
        <p className="text-xs text-text-3">No pudimos traer el catálogo de Tienda Nube todavía.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-card border border-border bg-surface p-5">
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-text-3">Aplicar costo en lote</p>
        <p className="mb-3 text-[11px] text-text-3">
          Tildá uno o varios productos y aplicá el mismo costo a todas sus variantes de un solo clic — ideal para modelos con muchos
          talles/colores.
        </p>

        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <input
            type="number"
            min={0}
            step="any"
            value={bulkCost}
            onChange={(e) => setBulkCost(e.target.value)}
            placeholder="Costo por unidad"
            className={`w-[170px] ${FIELD_CLASS}`}
          />
          <button
            type="button"
            disabled={saving || !bulkCost || selectedGroups.length === 0}
            onClick={handleBulkApply}
            className="rounded-control bg-primary px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
          >
            {saving
              ? 'Aplicando…'
              : selectedGroups.length > 0
                ? `Aplicar a ${selectedVariantCount} variante${selectedVariantCount === 1 ? '' : 's'} (${selectedGroups.length} producto${selectedGroups.length === 1 ? '' : 's'})`
                : 'Aplicar a variantes seleccionadas'}
          </button>
        </div>
        {error && <p className="mb-2 text-xs text-red">{error}</p>}
        {success && <p className="mb-2 text-xs text-green">{success}</p>}

        <ul className="flex max-h-[400px] flex-col gap-1.5 overflow-y-auto">
          {groups.map((g) => (
            <li key={g.productId} className="rounded-control border border-border bg-surface-2/60">
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(g.productId)}
                    onChange={() => toggleSelected(g.productId)}
                    className="h-4 w-4 shrink-0 accent-accent"
                  />
                  <ProductThumbnail src={g.imageUrl} alt={g.productName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-text">{g.productName}</p>
                    <p className="text-[11px] text-text-3">
                      {g.variants.length} variante{g.variants.length === 1 ? '' : 's'} —{' '}
                      {g.mixed ? 'costos mixtos' : g.sharedCost !== null ? `${money(g.sharedCost)} c/u` : 'sin costo cargado'}
                    </p>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === g.productId ? null : g.productId)}
                  className="shrink-0 text-[11px] font-medium text-text-3 transition-colors duration-200 ease-out hover:text-accent"
                >
                  {expandedId === g.productId ? 'Cerrar' : 'Editar variantes'}
                </button>
              </div>
              {expandedId === g.productId && (
                <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2.5">
                  {g.variants.map((v) => (
                    <VariantFineTuneRow key={v.variantId} variant={v} initialCost={costMap.get(v.variantId)} />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {costs.length > 0 && (
        <div className="rounded-card border border-border bg-surface p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-3">Costos cargados</p>
          <ul className="flex max-h-[260px] flex-col gap-1.5 overflow-y-auto">
            {costs.map((c) => (
              <li
                key={c.variantId}
                className="flex items-center justify-between gap-3 rounded-control border border-border bg-surface-2/60 px-3 py-2"
              >
                <p className="min-w-0 flex-1 truncate text-xs font-medium text-text">{c.productName ?? `Variante ${c.variantId}`}</p>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="tabular-nums text-xs font-semibold text-text">{money(c.cost)}</p>
                  <form action={deleteProductCostAction.bind(null, c.variantId)}>
                    <ConfirmSubmitButton
                      confirmMessage="¿Borrar este costo?"
                      className="text-[11px] font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
                    >
                      Borrar
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
