import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { buildSalesReport, resolvePeriod } from '@/lib/reports/sales-report'
import { SalesWorkspace } from './sales-workspace'

// Dashboard de Rentabilidad Neta — /operations/sales cruza Meta Ads + Tienda
// Nube hasta el Resultado Neto Real. Todos los cálculos viven en
// lib/reports/sales-report.ts, compartidos con la conexión de Claude
// (api/mcp): la pantalla y Claude siempre dan los mismos números.

export default async function OperationsSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>
}) {
  const { days: daysParam, from: fromParam, to: toParam } = await searchParams
  const { periodStart, periodEnd, activePreset, customFrom, customTo } = resolvePeriod(daysParam, fromParam, toParam)

  const { activeOrganizationId } = await getDashboardContext()

  if (!activeOrganizationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-lg font-semibold text-text">Todavía no pertenecés a ninguna organización</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const r = await buildSalesReport(supabase, activeOrganizationId, periodStart, periodEnd)

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Ventas y Operaciones</h1>
          <p className="mt-0.5 max-w-[560px] text-[13px] text-text-2">
            Sistema Operativo de Rentabilidad — cruce de Meta Ads y Tienda Nube hasta el Resultado Neto Real.
          </p>
        </div>
      </div>

      <SalesWorkspace
        activePreset={activePreset}
        customFrom={customFrom}
        customTo={customTo}
        tnConnected={r.tnConnected}
        tnError={r.tnError}
        ordersTruncated={r.ordersTruncated}
        checkoutsTruncated={r.checkoutsTruncated}
        costsLoadError={r.costsLoadError}
        storeName={r.storeName}
        lastSyncedAt={new Date().toISOString()}
        metaConnected={r.metaConnected}
        hasMetaSpend={r.hasMetaSpend}
        summary={r.summary}
        waterfall={r.waterfall}
        dailyData={r.dailyData}
        ranking={r.ranking}
        ledger={r.ledger}
        insights={r.insights}
        funnelSteps={r.funnelSteps}
        kpis={r.kpis}
        trends={r.trends}
        series={r.series}
        currencyMismatchNoRate={r.currencyMismatchNoRate}
        manualSales={r.manualSales}
        manualTotal={r.manualTotal}
        finConfig={r.finConfig}
        paymentSettings={r.paymentSettings}
        installmentsSeen={r.installmentsSeen}
        installmentsWithoutCost={r.installmentsWithoutCost}
        hasOtherGateways={r.hasOtherGateways}
        channels={r.channels}
        paymentFaltantes={r.paymentFaltantes}
        costsList={r.costsList}
        catalog={r.catalog}
        operatingCosts={r.operatingCosts}
        checkoutFunnel={r.checkoutFunnel}
        checkoutError={r.checkoutError}
        abandonedCheckouts={r.abandonedCheckouts}
        coupons={r.coupons}
        unitEconomics={r.unitEconomics}
        missingSetup={r.missingSetup}
        gatewaySharePct={r.gatewaySharePct}
        usdArsRate={r.usdArsRate}
      />
    </div>
  )
}
