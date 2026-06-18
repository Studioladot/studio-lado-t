import { getState, setState } from '../utils/state.js';
import { supabase, fetchGastos, fetchVentasDia, fetchFinConfig, fetchTiendaNubeConnection } from '../services/supabase.js';
import { esc, fmtN, toast, openModal, closeModal, todayStr } from '../utils/helpers.js';
import {
  renderFinPanel, renderGastos, renderVentasDia,
  calcBreakeven, saveGasto as svcSaveGasto,
  filterGastos as svcFilterGastos,
  delGasto as svcDelGasto,
  togglePagado as svcTogglePagado,
  delVentaDia as svcDelVentaDia,
  saveFinConfig as svcSaveFinConfig,
} from '../services/finances.js';

export async function loadFinanzas() {
  const state = getState();
  if (!state.me) return;
  const uid = state.me.id;
  const [gRes, vRes, cRes, tRes] = await Promise.all([
    fetchGastos(uid),
    fetchVentasDia(uid),
    fetchFinConfig(uid),
    fetchTiendaNubeConnection(uid),
  ]);
  setState('gastos', gRes);
  setState('ventasDia', vRes);
  if (cRes) Object.assign(getState().finConfig, cRes);
  setState('tnConnection', tRes || null);
  renderFinPanel();
  renderGastos();
  renderVentasDia();
}
window.loadFinanzas = loadFinanzas;

export function switchFinTab(tab, btn) {
  setState('finActiveTab', tab);
  ['panel', 'gastos', 'ventas'].forEach(t => {
    const el = document.getElementById('fin-tab-' + t);
    const bt = document.getElementById('ftab-' + t);
    if (el) el.style.display = t === tab ? 'block' : 'none';
    if (bt) {
      bt.style.color = t === tab ? 'var(--accent)' : 'var(--text2)';
      bt.style.borderBottomColor = t === tab ? 'var(--accent)' : 'transparent';
      bt.style.fontWeight = t === tab ? '600' : '500';
    }
  });
}
window.switchFinTab = switchFinTab;

export function openAddGasto() {
  const f = document.getElementById('gasto-fecha');
  if (f) f.valueAsDate = new Date();
  openModal('modal-gasto');
}
window.openAddGasto = openAddGasto;

export async function saveGastoFromUI() {
  const desc = document.getElementById('gasto-desc')?.value?.trim();
  if (!desc) { toast('Ingresa el concepto del gasto'); return; }
  const fechaVal = document.getElementById('gasto-fecha')?.value;
  let diaVen = null;
  if (fechaVal) {
    const d = new Date(fechaVal + 'T12:00:00');
    if (!isNaN(d.getTime())) diaVen = d.getDate();
  }
  const rec = {
    user_id: getState().me.id, nombre: desc,
    monto: +document.getElementById('gasto-monto')?.value || 0,
    categoria: document.getElementById('gasto-categoria')?.value || 'otro',
    tipo: document.getElementById('gasto-tipo')?.value || 'fijo',
    dia_vencimiento: diaVen,
    notas: document.getElementById('gasto-notas')?.value?.trim() || '',
  };
  const { data, error } = await getState().db.from('expenses').insert([rec]).select();
  if (error) { toast('Error: ' + error.message); return; }
  const state = getState();
  state.gastos.unshift(data[0]);
  renderGastos();
  renderFinPanel();
  closeModal('modal-gasto');
  ['gasto-desc', 'gasto-monto', 'gasto-fecha', 'gasto-notas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  toast('Gasto guardado ✓');
}
window.saveGastoFromUI = saveGastoFromUI;

export function deleteGasto(id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  svcDelGasto(id);
}
window.deleteGasto = deleteGasto;

export function togglePagadoGasto(id) {
  svcTogglePagado(id);
}
window.togglePagadoGasto = togglePagadoGasto;

export function handleGastoFilter(f, el) {
  svcFilterGastos(f, el);
}
window.handleGastoFilter = handleGastoFilter;

export function openAddVenta() {
  const f = document.getElementById('venta-fecha');
  if (f) f.value = todayStr();
  openModal('modal-venta');
}
window.openAddVenta = openAddVenta;

export async function saveVentaFromUI() {
  const fecha = document.getElementById('venta-fecha')?.value;
  const monto = +document.getElementById('venta-monto')?.value || 0;
  if (!fecha || monto <= 0) { toast('Ingresa fecha y monto'); return; }
  const rec = {
    user_id: getState().me.id, fecha, monto,
    unidades: +document.getElementById('venta-unidades')?.value || 0,
    canal: document.getElementById('venta-canal')?.value || 'manual',
    notas: document.getElementById('venta-notas')?.value?.trim() || '',
  };
  const { data, error } = await getState().db.from('daily_sales').insert([rec]).select();
  if (error) { toast('Error: ' + error.message); return; }
  const state = getState();
  state.ventasDia.unshift(data[0]);
  renderVentasDia();
  renderFinPanel();
  closeModal('modal-venta');
  ['venta-monto', 'venta-unidades', 'venta-notas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const f = document.getElementById('venta-fecha');
  if (f) f.value = todayStr();
  toast('Venta registrada ✓');
}
window.saveVentaFromUI = saveVentaFromUI;

export function deleteVenta(id) {
  if (!confirm('¿Eliminar esta venta?')) return;
  svcDelVentaDia(id);
}
window.deleteVenta = deleteVenta;

export function onVentasMesFilterChange() {
  renderVentasDia();
}
window.onVentasMesFilterChange = onVentasMesFilterChange;

export function openBreakeven() {
  const { totalGastos, breakeven, margen } = calcBreakeven();
  const be = document.getElementById('be-breakeven');
  if (be) be.textContent = breakeven > 0 ? '$' + fmtN(breakeven) : '—';
  const tg = document.getElementById('be-total-gastos');
  if (tg) tg.textContent = '$' + fmtN(totalGastos);
  const mg = document.getElementById('be-margen');
  if (mg) mg.textContent = (margen * 100) + '%';
  openModal('modal-breakeven');
}
window.openBreakeven = openBreakeven;

export function connectTiendaNube() {
  const TN_CLIENT_ID = '34513';
  const state = getState();
  const authUrl = `https://www.tiendanube.com/apps/${TN_CLIENT_ID}/authorize?state=${state.me.id}`;
  window.location.href = authUrl;
}
window.connectTiendaNube = connectTiendaNube;

export function openFinConfig() {
  const cfg = getState().finConfig;
  const fm = document.getElementById('fc-margen');
  if (fm) fm.value = cfg.margen_bruto;
  const fd = document.getElementById('fc-dias');
  if (fd) fd.value = cfg.dias_operativos;
  const fo = document.getElementById('fc-objetivo');
  if (fo) fo.value = cfg.objetivo_ganancia_pct;
  openModal('modal-fin-config');
}
window.openFinConfig = openFinConfig;

export function saveFinConfigFromUI() {
  svcSaveFinConfig();
}
window.saveFinConfigFromUI = saveFinConfigFromUI;

// backward compat aliases
window.filterGastos = function (f, el) {
  document.querySelectorAll('#page-finanzas .ft').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  svcFilterGastos(f, el);
};
window.saveGasto = function () { window.saveGastoFromUI(); };
window.saveVentaDia = function () { window.saveVentaFromUI(); };
window.loadAnalisis = function () { toast('Análisis: conectá Meta Ads y Tienda Nube primero'); };
window.setVentasView = function (view) {
  document.querySelectorAll('[id^="ventas-view-"]').forEach(b => {
    b.style.background = 'transparent'; b.style.color = 'var(--text2)'; b.style.fontWeight = '500';
  });
  const btn = document.getElementById('ventas-view-' + view);
  if (btn) { btn.style.background = 'var(--accent)'; btn.style.color = '#fff'; btn.style.fontWeight = '600'; }
};
window.disconnectTiendaNube = function () {
  if (!confirm('¿Desconectar Tienda Nube?')) return;
  const { user } = getState();
  if (user) supabase.from('tiendanube_connections').delete().eq('user_id', user.id).then(() => toast('Tienda Nube desconectada'));
};
window.loadTNAll = function () { toast('Sincronizando ventas de Tienda Nube...'); };
window.loadAnProductos = function () { toast('Cargando productos...'); };
window.openAnBulkModal = function () { toast('Edición bulk próximamente'); };
