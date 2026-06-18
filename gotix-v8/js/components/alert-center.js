import { getState } from '../utils/state.js';
import { getAlerts, dismissAlert, clearAlerts } from '../services/alerts.js';

export function renderAlertCenter() {
  const alerts = getAlerts();
  const el = document.getElementById('alert-center');
  if (!el) return;
  el.innerHTML = '';
  if (alerts.length === 0) {
    el.innerHTML = '<p class="t-muted" style="text-align:center;padding:16px">No hay alertas</p>';
    return;
  }
  const list = document.createElement('div');
  list.className = 'alert-list';
  alerts.forEach(a => {
    const icons = { CRITICO: '🔴', Importante: '🟡', Informativo: '🔵' };
    const item = document.createElement('div');
    item.className = 'alert-item';
    item.style.cssText = 'display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-radius:8px;margin-bottom:6px;cursor:pointer';
    item.style.background = a.severidad === 'CRITICO' ? 'rgba(239,68,68,0.1)' : a.severidad === 'Importante' ? 'rgba(234,179,8,0.1)' : 'rgba(59,130,246,0.1)';
    const severityColor = a.severidad === 'CRITICO' ? '#ef4444' : a.severidad === 'Importante' ? '#eab308' : '#3b82f6';
    item.onclick = () => dismissAlert(a.id);
    item.innerHTML = `
      <span style="font-size:16px;flex-shrink:0">${icons[a.severidad] || '🔵'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;color:${severityColor}">${esc(a.severidad)}</div>
        <div style="font-size:13px;color:#e2e8f0;margin-top:2px">${esc(a.mensaje)}</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px">${esc(a.seccion)} · ${fmtDate(a.fecha)}</div>
      </div>
      <button class="btn-icon" data-dismiss style="background:none;border:none;color:#64748b;cursor:pointer;font-size:14px;padding:2px">×</button>
    `;
    const btn = item.querySelector('[data-dismiss]');
    if (btn) btn.onclick = (e) => { e.stopPropagation(); dismissAlert(a.id); };
    list.appendChild(item);
  });
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px';
  hdr.innerHTML = `<span style="font-size:13px;font-weight:600;color:#94a3b8">${alerts.length} alertas</span>
    <button class="btn btn-ghost btn-xs" onclick="clearAlerts()">Limpiar</button>`;
  el.prepend(hdr);
  el.appendChild(list);
}

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function fmtDate(d) { if (!d) return ''; const dt = new Date(d); return dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }

window.renderAlertCenter = renderAlertCenter;
window.clearAlerts = clearAlerts;
export default { renderAlertCenter };
