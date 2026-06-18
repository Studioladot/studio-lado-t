export function fmtNum(n) {
  return n ? Number(n).toLocaleString('es-AR') : '—';
}

export function fmtN(n) {
  return Math.round(n).toLocaleString('es-AR');
}

export function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return d;
  }
}

export function esc(v) {
  return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function toast(msg, t = 2400) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), t);
}

export function debounce(fn, ms = 1000) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function roasColor(r) {
  return +r >= 4 ? 'var(--green)' : +r >= 2 ? 'var(--blue)' : +r >= 1.5 ? 'var(--amber)' : 'var(--red)';
}

export function statusBadge(s) {
  const map = { ACTIVE: 'b-green', PAUSED: 'b-amber', ARCHIVED: 'b-gray', DELETED: 'b-red' };
  const label = { ACTIVE: 'Activa', PAUSED: 'Pausada', ARCHIVED: 'Archivada', DELETED: 'Eliminada' };
  return `<span class="badge ${map[s] || 'b-gray'}">${label[s] || s}</span>`;
}

export function setText(id, txt) {
  const e = document.getElementById(id);
  if (e) e.textContent = txt;
}

export function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

export function openModalDynamic(content) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-content" style="max-width:480px">${content}</div>`;
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  return overlay;
}

export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function currentMonthStr() {
  return new Date().toISOString().substring(0, 7);
}

export function daysInMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function fmtCurrency(n) {
  return '$' + fmtN(n);
}
