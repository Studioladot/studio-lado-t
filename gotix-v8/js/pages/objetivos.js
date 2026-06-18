import { getState, setState } from '../utils/state.js';
import { fmtN, fmtDate, fmtCurrency, todayStr, esc, toast, openModal, closeModal } from '../utils/helpers.js';
import { supabase, fetchObjectives, saveObjective, deleteObjective, fetchScripts, saveScript, deleteScript } from '../services/supabase.js';

export async function loadObjetivos() {
  const state = getState();
  if (!state.me) return;
  const [objRes, scrRes] = await Promise.all([
    fetchObjectives(),
    fetchScripts(),
  ]);
  setState('objectives', objRes);
  setState('scripts', scrRes);
  renderObjetivos();
  renderScripts();
  renderBib();
}
window.loadObjetivos = loadObjetivos;

export function renderObjetivos() {
  const list = document.getElementById('objetivos-list');
  const prog = document.getElementById('obj-progress');
  if (!list) return;
  const objs = getState().objectives || [];
  if (!objs.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">&#127919;</div><div class="empty-msg">Sin objetivos</div><div class="empty-sub">Agrega tu primer objetivo</div></div>';
    if (prog) prog.innerHTML = '';
    return;
  }
  list.innerHTML = objs.map(o => {
    const dias = o.dias || 0;
    const hoy = new Date();
    const fechaLim = o.fecha_limite ? new Date(o.fecha_limite) : new Date(hoy.getTime() + dias * 86400000);
    const totalDias = Math.max(1, Math.round((fechaLim - new Date(hoy.getTime() - totalDias * 86400000)) / 86400000));
    let totalDiasCalc = dias;
    if (o.fecha_limite) {
      const inicio = new Date(o.fecha_limite);
      inicio.setDate(inicio.getDate() - dias);
      totalDiasCalc = Math.max(1, Math.round((fechaLim - inicio) / 86400000));
    }
    const transcurridos = Math.round((hoy - new Date(hoy.getTime() - totalDiasCalc * 86400000)) / 86400000);
    const pct = Math.min(100, Math.max(0, Math.round((transcurridos / totalDiasCalc) * 100)));
    return `
    <div class="obj-row">
      <div class="obj-info">
        <div class="obj-name">${esc(o.titulo||'')}</div>
        <div class="obj-meta">${esc(o.tipo||'')}${o.monto?` · ${fmtCurrency(o.monto)}`:''}${o.fecha_limite?` · ${fmtDate(o.fecha_limite)}`:''}</div>
      </div>
      <div class="obj-bar-wrap">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-pct">${pct}%</div>
      </div>
      <div>
        <button class="btn btn-sm btn-ghost" onclick="openAddObjetivo()">&#9998;</button>
        <button class="btn btn-sm btn-red" onclick="deleteObjetivo('${o.id}')">&#10005;</button>
      </div>
    </div>`;
  }).join('');
  if (prog) {
    const cumplidos = objs.filter(o => o.estado === 'realizada' || o.estado === 'completado').length;
    const total = objs.length;
    prog.innerHTML = `<div style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text2)">Progreso: <strong>${cumplidos}/${total}</strong> objetivos completados</div>`;
  }
}
window.renderObjetivos = renderObjetivos;

export function renderScripts() {
  const list = document.getElementById('scripts-list');
  if (!list) return;
  const scripts = (getState().scripts || []).filter(s => s.tipo === 'guion' || !s.tipo || s.tipo === '');
  if (!scripts.length) {
    list.innerHTML = '<div class="empty" style="padding:24px"><div class="empty-msg">Sin guiones</div><div class="empty-sub">Crea tu primer guion</div></div>';
    return;
  }
  list.innerHTML = scripts.map(s => `
    <div class="script-item">
      <div class="si-title">${esc(s.titulo||'Sin título')}</div>
      <div class="si-meta">${esc(s.tipo||'guion')}${s.duracion?` · ${esc(s.duracion)}s`:''}</div>
      <div style="display:flex;gap:6px;margin-top:4px">
        <button class="btn btn-sm btn-ghost" onclick="openAddScript()">&#9998;</button>
        <button class="btn btn-sm btn-red" onclick="deleteScript('${s.id}')">&#10005;</button>
      </div>
    </div>`).join('');
}
window.renderScripts = renderScripts;

export function renderBib() {
  const list = document.getElementById('bib-list');
  if (!list) return;
  const items = (getState().scripts || []).filter(s => s.tipo === 'bib' || s.tipo === 'ads');
  if (!items.length) {
    list.innerHTML = '<div class="empty" style="padding:24px"><div class="empty-msg">Sin anuncios en biblioteca</div><div class="empty-sub">Crea tu primer anuncio</div></div>';
    return;
  }
  const grid = list;
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(240px,1fr))';
  grid.style.gap = '10px';
  grid.innerHTML = items.map(s => `
    <div class="card" style="margin:0">
      <div style="font-size:13px;font-weight:700;margin-bottom:6px">${esc(s.titulo||'')}</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:6px">${esc(s.contenido||'')}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <span class="badge ${s.tipo==='bib'?'b-teal':'b-accent'}">${esc(s.tipo)}</span>
        ${s.tags?`<span class="badge b-gray">${esc(s.tags)}</span>`:''}
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn btn-sm btn-ghost" onclick="openAddBib()">&#9998;</button>
        <button class="btn btn-sm btn-red" onclick="deleteBib('${s.id}')">&#10005;</button>
      </div>
    </div>`).join('');
}
window.renderBib = renderBib;

export function openAddObjetivo() {
  document.getElementById('obj-titulo').value = '';
  document.getElementById('obj-tipo').value = 'ventas';
  document.getElementById('obj-monto').value = '';
  document.getElementById('obj-fecha').value = '';
  document.getElementById('obj-dias').value = '30';
  openModal('modal-obj');
}
window.openAddObjetivo = openAddObjetivo;

export async function saveObjetivoFromUI() {
  const titulo = document.getElementById('obj-titulo')?.value?.trim();
  if (!titulo) { toast('Ingresa el título'); return; }
  const data = {
    titulo,
    tipo: document.getElementById('obj-tipo')?.value || 'ventas',
    monto: parseFloat(document.getElementById('obj-monto')?.value) || 0,
    fecha_limite: document.getElementById('obj-fecha')?.value || null,
    dias: parseInt(document.getElementById('obj-dias')?.value) || 30,
  };
  const res = await saveObjective(data);
  if (res) {
    const objs = getState().objectives || [];
    objs.unshift(res);
    setState('objectives', objs);
    renderObjetivos();
    closeModal('modal-obj');
    toast('Objetivo guardado');
  }
}
window.saveObjetivoFromUI = saveObjetivoFromUI;

export async function deleteObjetivo(objId) {
  if (!confirm('¿Eliminar este objetivo?')) return;
  await deleteObjective(objId);
  setState('objectives', (getState().objectives || []).filter(o => o.id !== objId));
  renderObjetivos();
  toast('Objetivo eliminado');
}
window.deleteObjetivo = deleteObjetivo;

export function openAddScript() {
  document.getElementById('script-titulo').value = '';
  document.getElementById('script-contenido').value = '';
  document.getElementById('script-tipo').value = 'guion';
  document.getElementById('script-duracion').value = '';
  document.getElementById('script-tags').value = '';
  openModal('modal-script');
}
window.openAddScript = openAddScript;

export async function saveScriptFromUI() {
  const titulo = document.getElementById('script-titulo')?.value?.trim();
  if (!titulo) { toast('Ingresa el título'); return; }
  const data = {
    titulo,
    contenido: document.getElementById('script-contenido')?.value?.trim() || '',
    tipo: document.getElementById('script-tipo')?.value || 'guion',
    duracion: parseInt(document.getElementById('script-duracion')?.value) || 0,
    tags: document.getElementById('script-tags')?.value?.trim() || '',
  };
  const res = await saveScript(data);
  if (res) {
    const scripts = getState().scripts || [];
    scripts.unshift(res);
    setState('scripts', scripts);
    renderScripts();
    renderBib();
    closeModal('modal-script');
    toast('Script guardado');
  }
}
window.saveScriptFromUI = saveScriptFromUI;

export async function deleteScript(scriptId) {
  if (!confirm('¿Eliminar este script?')) return;
  await deleteScript(scriptId);
  setState('scripts', (getState().scripts || []).filter(s => s.id !== scriptId));
  renderScripts();
  renderBib();
  toast('Script eliminado');
}
window.deleteScript = deleteScript;

export function loadScripts() {
  renderScripts();
}
window.loadScripts = loadScripts;

export function loadBib() {
  renderBib();
}
window.loadBib = loadBib;

export function openAddBib() {
  document.getElementById('script-titulo').value = '';
  document.getElementById('script-contenido').value = '';
  document.getElementById('script-tipo').value = 'bib';
  document.getElementById('script-duracion').value = '';
  document.getElementById('script-tags').value = '';
  openModal('modal-script');
}
window.openAddBib = openAddBib;

export async function saveBibFromUI() {
  const titulo = document.getElementById('script-titulo')?.value?.trim();
  if (!titulo) { toast('Ingresa el título'); return; }
  const data = {
    titulo,
    contenido: document.getElementById('script-contenido')?.value?.trim() || '',
    tipo: 'bib',
    duracion: 0,
    tags: document.getElementById('script-tags')?.value?.trim() || '',
  };
  const res = await saveScript(data);
  if (res) {
    const scripts = getState().scripts || [];
    scripts.unshift(res);
    setState('scripts', scripts);
    renderBib();
    renderScripts();
    closeModal('modal-script');
    toast('Anuncio guardado en biblioteca');
  }
}
window.saveBibFromUI = saveBibFromUI;

export async function deleteBib(bibId) {
  if (!confirm('¿Eliminar este anuncio?')) return;
  await deleteScript(bibId);
  setState('scripts', (getState().scripts || []).filter(s => s.id !== bibId));
  renderBib();
  renderScripts();
  toast('Anuncio eliminado');
}
window.deleteBib = deleteBib;

// backward compat aliases
window.filterBib = function (f, el) {
  document.querySelectorAll('#page-meta .ft, #page-objetivos .ft').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  const items = (getState().scripts || []).filter(s => s.tipo === 'bib' || s.tipo === 'ads');
  const list = document.getElementById('bib-list');
  if (!list) return;
  const filtered = f === 'all' ? items : items.filter(s => (s.estado || 'activo') === f);
  if (!filtered.length) { list.innerHTML = '<div class="empty" style="padding:24px"><div class="empty-msg">Sin resultados</div></div>'; return; }
  list.innerHTML = filtered.map(s => `
    <div class="card" style="margin:0">
      <div style="font-size:13px;font-weight:700;margin-bottom:6px">${esc(s.titulo||'')}</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:6px">${esc(s.contenido||'')}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <span class="badge ${s.tipo==='bib'?'b-teal':'b-accent'}">${esc(s.tipo)}</span>
        ${s.tags ? `<span class="badge b-gray">${esc(s.tags)}</span>` : ''}
      </div>
    </div>`).join('');
};
window.newScript = function () { openAddScript(); };
