import { getState, setState, onStateChange } from '../utils/state.js';
import { supabase, signIn, signUp, signOut, fetchMetrics } from '../services/supabase.js';
import { renderAlertCenter } from '../components/alert-center.js';
import { renderBusinessScore } from '../components/business-score.js';
import { navigateTo } from '../router.js';
import { openModal, closeModal, todayStr, esc, fmtN, toast } from '../utils/helpers.js';

export async function loadDashboard() {
  const me = getState().me;
  if (!me) return;
  const metrics = await fetchMetrics(me.id);
  setState('metrics', metrics);
  renderMetricCards(metrics);
  renderChart(metrics);
  renderAlertCenter();
  renderBusinessScore();
  renderRecentActivity(metrics);
}
window.loadDashboard = loadDashboard;

// backward compat aliases
window.dashRefreshMeta = loadDashboard;
window.dashAutoSnapshot = async function () {
  try {
    const m = await import('../services/meta-ads.js');
    await m.autoSnapshot();
    toast('Snapshot automático completado');
  } catch (e) { toast('Error: ' + e.message); }
};
window.exportCSV = function () {
  const { metrics } = getState();
  if (!metrics || !metrics.length) { toast('Sin datos para exportar'); return; }
  const headers = Object.keys(metrics[0]).join(',');
  const rows = metrics.map(m => Object.values(m).map(v => typeof v === 'string' ? `"${v.replace(/"/g,'""')}"` : v).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gotix_metrics.csv'; a.click();
  URL.revokeObjectURL(a.href); toast('CSV exportado');
};
window.setRankingLevel = function (level, btn) {
  document.querySelectorAll('#page-meta [id^="rtab-"]').forEach(b => { b.className = 'btn btn-sm btn-outline'; });
  if (btn) btn.className = 'btn btn-sm btn-accent';
};
window.saveBenchmarks = function () { toast('Benchmarks guardados'); };


function renderMetricCards(metrics) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recent = metrics.filter(m => new Date(m.created_at) >= cutoff);
  const inv = recent.reduce((s, m) => s + (Number(m.inversion) || 0), 0);
  const ven = recent.reduce((s, m) => s + (Number(m.ventas) || 0), 0);
  const comp = recent.reduce((s, m) => s + (Number(m.compras) || 0), 0);
  const roas = inv > 0 ? ven / inv : 0;
  const cpa = comp > 0 ? inv / comp : 0;
  const ctr = recent.length > 0 ? recent.reduce((s, m) => s + (Number(m.ctr) || 0), 0) / recent.length : 0;
  const cpm = recent.length > 0 ? recent.reduce((s, m) => s + (Number(m.cpm) || 0), 0) / recent.length : 0;
  const targetRoas = getState().config?.targetRoas || 4;
  const el = document.getElementById('dashboard-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card">
      <span class="stat-label">Inversión total</span>
      <span class="stat-value">$${fmtN(inv)}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">Ventas totales</span>
      <span class="stat-value">$${fmtN(ven)}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">ROAS</span>
      <span class="stat-value" style="color:${roasColor(roas, targetRoas)}">${fmtN(roas)}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">CPA</span>
      <span class="stat-value">$${fmtN(cpa)}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">CTR</span>
      <span class="stat-value">${fmtN(ctr)}%</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">CPM</span>
      <span class="stat-value">$${fmtN(cpm)}</span>
    </div>
  `;
}

function roasColor(r, target) {
  return +r >= target ? 'var(--green)' : +r >= target / 2 ? 'var(--amber)' : 'var(--red)';
}

function renderChart(metrics) {
  const el = document.getElementById('dashboard-chart');
  if (!el) return;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    const dayVals = metrics.filter(m => new Date(m.created_at).toISOString().split('T')[0] === dayStr);
    days.push({ date: dayStr, value: dayVals.reduce((s, m) => s + (Number(m.inversion) || 0), 0) });
  }
  const max = Math.max(...days.map(d => d.value), 1);
  el.innerHTML = '<div class="bar-chart">' + days.map(d => `
    <div class="bar-col">
      <div class="bar" style="height:${(d.value / max) * 100}%"></div>
      <span class="bar-label">${esc(d.date.slice(5))}</span>
    </div>
  `).join('') + '</div>';
}

function renderRecentActivity(metrics) {
  const el = document.getElementById('recent-activity');
  if (!el) return;
  const items = metrics.slice(0, 10);
  el.innerHTML = items.map(m => `
    <div class="activity-item">
      <span>${esc(m.campaign_name || m.ad_name || 'Sin nombre')}</span>
      <span>$${fmtN(m.inversion || 0)}</span>
    </div>
  `).join('');
}
