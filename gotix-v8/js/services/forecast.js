// Predicciones — Estimaciones y proyecciones
import state from '../utils/state.js';

export function calculateForecast() {
  const hoy = new Date();
  const mesActual = hoy.toISOString().substring(0, 7);
  const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const diaActual = hoy.getDate();
  const diasRestantes = diasEnMes - diaActual;

  // Ventas actuales del mes
  const ventasMes = state.ventasDia.filter(v => (v.fecha || '').startsWith(mesActual));
  const totalVentas = ventasMes.reduce((a, v) => a + (+v.monto || 0), 0);
  const totalUnidades = ventasMes.reduce((a, v) => a + (+v.unidades || 0), 0);

  // Gasto Meta del mes
  const gastoMeta = state.metaCampaigns.reduce((a, c) => a + parseFloat(c.insights?.spend || 0), 0);

  // Gastos del mes
  const totalGastos = state.gastos.reduce((a, g) => a + (+g.monto || 0), 0);
  const margen = (state.finConfig.margen_bruto || 48) / 100;

  // Average daily sales
  const avgDailySales = diaActual > 0 ? totalVentas / diaActual : 0;
  const avgDailyUnits = diaActual > 0 ? totalUnidades / diaActual : 0;

  // Projections
  const projectedMonthlySales = totalVentas + avgDailySales * diasRestantes;
  const projectedMonthlyUnits = totalUnidades + avgDailyUnits * diasRestantes;
  const projectedMonthlyProfit = (projectedMonthlySales * margen) - totalGastos;
  const projectedBreakeven = totalGastos / margen;

  // Sales needed per day to meet breakeven
  const salesNeededDaily = projectedBreakeven > totalVentas
    ? (projectedBreakeven - totalVentas) / Math.max(diasRestantes, 1)
    : 0;

  // Goal tracking
  const goal = state.objectives.filter(o => (o.month || mesActual) === mesActual);
  const goalProgress = goal.map(o => ({
    name: o.name,
    current: +o.current_val || 0,
    target: +o.target || 1,
    percent: Math.min(100, Math.round(((+o.current_val || 0) / (+o.target || 1)) * 100)),
    projected: diaActual > 0
      ? Math.round((+o.current_val || 0) / diaActual * diasEnMes)
      : 0
  }));

  return {
    mesActual,
    diasTranscurridos: diaActual,
    diasRestantes,
    totalVentas,
    totalUnidades,
    gastoMeta,
    totalGastos,
    avgDailySales,
    avgDailyUnits,
    projectedMonthlySales,
    projectedMonthlyUnits,
    projectedMonthlyProfit,
    projectedBreakeven,
    salesNeededDaily,
    goalProgress,
    margen: margen * 100,
  };
}

export function renderForecastCard() {
  const f = calculateForecast();
  const el = document.getElementById('forecast-card');
  if (!el) return;

  const isProfitable = f.projectedMonthlyProfit > 0;

  el.innerHTML = `
    <div class="card-title">Predicciones del mes</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div style="background:var(--surface2);border-radius:var(--r);padding:12px">
        <div style="font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Proyectado facturacion</div>
        <div style="font-size:18px;font-weight:700">$${Math.round(f.projectedMonthlySales).toLocaleString('es-AR')}</div>
        <div style="font-size:11px;color:var(--text2)">vs $${Math.round(f.totalVentas).toLocaleString('es-AR')} actual</div>
      </div>
      <div style="background:${isProfitable ? 'var(--green-l)' : 'var(--red-l)'};border-radius:var(--r);padding:12px">
        <div style="font-size:10px;color:${isProfitable ? 'var(--green)' : 'var(--red)'};text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;font-weight:700">Profit proyectado</div>
        <div style="font-size:18px;font-weight:800;color:${isProfitable ? 'var(--green)' : 'var(--red)'}">$${Math.round(f.projectedMonthlyProfit).toLocaleString('es-AR')}</div>
        <div style="font-size:11px;color:var(--text2)">Margen ${f.margen.toFixed(0)}%</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div style="text-align:center;padding:8px;background:var(--surface2);border-radius:var(--r)">
        <div style="font-size:10px;color:var(--text2)">Ventas/dia necesarias</div>
        <div style="font-size:14px;font-weight:700;color:var(--amber)">$${Math.round(f.salesNeededDaily).toLocaleString('es-AR')}</div>
      </div>
      <div style="text-align:center;padding:8px;background:var(--surface2);border-radius:var(--r)">
        <div style="font-size:10px;color:var(--text2)">Dias restantes</div>
        <div style="font-size:14px;font-weight:700">${f.diasRestantes}</div>
      </div>
      <div style="text-align:center;padding:8px;background:var(--surface2);border-radius:var(--r)">
        <div style="font-size:10px;color:var(--text2)">Avg diario actual</div>
        <div style="font-size:14px;font-weight:700">$${Math.round(f.avgDailySales).toLocaleString('es-AR')}</div>
      </div>
    </div>
    ${f.goalProgress.length ? `
      <div style="margin-top:12px;padding-top:12px;border-top:0.5px solid var(--border)">
        <div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Progreso de objetivos</div>
        ${f.goalProgress.map(g => `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <div style="flex:1;font-size:12px;font-weight:500">${g.name}</div>
            <div style="flex:0 0 100px"><div class="progress-bar"><div class="progress-fill" style="width:${g.percent}%;background:${g.percent >= 100 ? 'var(--green)' : g.percent >= 60 ? 'var(--blue)' : 'var(--amber)'}"></div></div></div>
            <div style="font-size:11px;font-weight:600;width:70px;text-align:right">${g.current} / ${g.target}</div>
            <div style="font-size:10px;color:var(--text2);width:50px;text-align:right">Proy: ${g.projected}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}
