import { getState, setState } from '../utils/state.js';
import { renderGauge } from './gauge.js';

export function calculateScore() {
  const { metrics, objetivos, config } = getState();
  if (!metrics || metrics.length === 0) return null;
  const days = 30;
  const cutoff = new Date(Date.now() - days * 864e5).toISOString();
  const recent = metrics.filter(m => m.fecha >= cutoff);
  const dailyTarget = (objetivos && objetivos.length > 0)
    ? objetivos.filter(o => o.tipo === 'ventas').reduce((s, o) => s + (o.monto / o.dias), 0)
    : config.objetivoDiario || 500;
  const targetRoas = config.targetRoas || 4;

  const totalSpend = recent.reduce((s, m) => s + (m.inversion || 0), 0);
  const totalSales = recent.reduce((s, m) => s + (m.ventas || 0), 0);
  const totalPurchases = recent.reduce((s, m) => s + (m.compras || 0), 0);
  const roas = totalSpend > 0 ? totalSales / totalSpend : 0;
  const roasScore = Math.min((roas / targetRoas) * 100, 100);
  const avgDaily = totalSales / days;
  const ventasScore = dailyTarget > 0 ? Math.min((avgDaily / dailyTarget) * 100, 100) : 50;
  const metaScore = objetivos && objetivos.length > 0
    ? Math.min(recent.filter(m => m.ventas >= dailyTarget).length / days * 100, 100)
    : 50;
  const consistenciaScore = totalPurchases > 0
    ? Math.min(recent.filter(m => m.compras > 0).length / days * 100, 100)
    : 50;
  const contenidoScore = 70;
  const puntaje = Math.round((roasScore * 0.3 + ventasScore * 0.2 + metaScore * 0.2 + consistenciaScore * 0.15 + contenidoScore * 0.15));
  const score = { puntaje, roasScore: Math.round(roasScore), ventasScore: Math.round(ventasScore), metaScore: Math.round(metaScore), consistenciaScore: Math.round(consistenciaScore), contenidoScore: Math.round(contenidoScore) };
  setState({ score });
  return score;
}

export function renderBusinessScore() {
  calculateScore();
  const { score } = getState();
  const el = document.getElementById('business-score-widget');
  if (!el) return;
  if (!score) { el.innerHTML = '<p class="t-muted">Completa las métricas para ver tu score</p>'; return; }
  el.innerHTML = '';
  const gaugeEl = document.createElement('div');
  gaugeEl.style.cssText = 'display:flex;justify-content:center;margin-bottom:12px';
  el.appendChild(gaugeEl);
  const c = score.puntaje > 70 ? '#22c55e' : score.puntaje > 40 ? '#eab308' : '#ef4444';
  renderGauge(gaugeEl, score.puntaje, 100, 'Score General', c);
  const breakdown = document.createElement('div');
  breakdown.className = 'score-grid';
  breakdown.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px';
  const items = [
    { label: 'ROAS', val: score.roasScore },
    { label: 'Ventas', val: score.ventasScore },
    { label: 'Meta', val: score.metaScore },
    { label: 'Consist.', val: score.consistenciaScore },
    { label: 'Contenido', val: score.contenidoScore },
  ];
  items.forEach(i => {
    const card = document.createElement('div');
    card.style.cssText = 'background:#1e293b;border-radius:8px;padding:8px;text-align:center';
    card.innerHTML = `<div style="font-size:20px;font-weight:700;color:#f8fafc">${i.val}</div><div style="font-size:11px;color:#94a3b8">${i.label}</div>`;
    breakdown.appendChild(card);
  });
  el.appendChild(breakdown);
}

window.renderBusinessScore = renderBusinessScore;
export default { calculateScore, renderBusinessScore };
