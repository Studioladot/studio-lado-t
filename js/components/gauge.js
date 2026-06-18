import { getState } from '../utils/state.js';

export function renderGauge(element, value, max, label, color) {
  const pct = Math.min(value / max, 1);
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const c = color || (pct > 0.7 ? '#22c55e' : pct > 0.4 ? '#eab308' : '#ef4444');
  const svg = `
<svg width="120" height="120" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="${r}" fill="none" stroke="#1e293b" stroke-width="8"/>
  <circle cx="50" cy="50" r="${r}" fill="none" stroke="${c}" stroke-width="8"
    stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"
    transform="rotate(-90 50 50)"/>
  <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
    fill="#f8fafc" font-size="22" font-weight="700">${Math.round(pct * 100)}</text>
  <text x="50" y="70" text-anchor="middle" fill="#94a3b8" font-size="8">${label}</text>
</svg>`;
  element.innerHTML = svg;
}

export function renderScoreGauge(element) {
  const { score } = getState();
  if (!score) { element.innerHTML = '<p class="t-muted">Completa las métricas para ver tu score</p>'; return; }
  renderGauge(element, score.puntaje, 100, 'Score', '#3a55b0');
  const breakdown = document.createElement('div');
  breakdown.className = 'score-breakdown';
  breakdown.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;justify-content:center';
  const items = [
    { label: 'ROAS', val: score.roasScore || 0 },
    { label: 'Ventas', val: score.ventasScore || 0 },
    { label: 'Meta', val: score.metaScore || 0 },
    { label: 'Consist.', val: score.consistenciaScore || 0 },
    { label: 'Contenido', val: score.contenidoScore || 0 },
  ];
  items.forEach(i => {
    const c = document.createElement('div');
    c.style.cssText = 'text-align:center';
    c.innerHTML = `<div style="font-size:18px;font-weight:700;color:#f8fafc">${i.val}</div><div style="font-size:10px;color:#94a3b8">${i.label}</div>`;
    breakdown.appendChild(c);
  });
  element.appendChild(breakdown);
}

export default { renderGauge, renderScoreGauge };
