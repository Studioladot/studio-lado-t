import { getState, setState } from '../utils/state.js';
import { esc, fmtN, fmtNum, toast, openModal, closeModal, roasColor, statusBadge, todayStr } from '../utils/helpers.js';
import {
  loadMetaCampaigns as apiLoadCampaigns,
  loadAdsets as apiLoadAdsets,
  loadAds as apiLoadAds,
  saveMetricSnapshot,
  autoSnapshot as apiAutoSnapshot,
  verifyMetaConnection,
  saveMetaConfig as apiSaveMetaConfig,
  getDateRangeParams,
} from '../services/meta-ads.js';

const LABEL_MAP = {
  today: 'Hoy', yesterday: 'Ayer', last_7d: '7 dias', last_14d: '14 dias',
  last_30d: '30 dias', last_90d: '90 dias', this_month: 'este mes',
  last_month: 'mes pasado', maximum: 'historico'
};

export async function loadMetaCampaigns(dateFrom, dateTo) {
  const state = getState();
  if (!state.me) return;
  document.getElementById('meta-adsets-section').style.display = 'none';
  document.getElementById('meta-ads-section').style.display = 'none';
  if (dateFrom && dateTo) {
    const since = document.getElementById('meta-date-since');
    const until = document.getElementById('meta-date-until');
    if (since) since.value = dateFrom;
    if (until) until.value = dateTo;
  }
  const tbody = document.getElementById('meta-camp-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text2)"><div style="display:flex;align-items:center;justify-content:center;gap:8px"><span class="ld"></span><span class="ld"></span><span class="ld"></span><span style="margin-left:4px">Cargando campanas...</span></div></td></tr>';
  }
  await apiLoadCampaigns();
  const { days, since, until, isCustom } = getDateRangeParams();
  const rangeLabel = isCustom ? `${since || '?'} → ${until || '?'}` : (LABEL_MAP[days] || days);
  const camps = getState().metaCampaigns;
  const sub = document.getElementById('meta-sub');
  if (sub) sub.textContent = `${camps.length} campanas — ${rangeLabel}`;
  renderCampaigns();
}
window.loadMetaCampaigns = loadMetaCampaigns;

export function filterMetaCamp(f, el) {
  setState('metaCampFilter', f);
  document.querySelectorAll('#page-meta .ft').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderCampaigns();
}
window.filterMetaCamp = filterMetaCamp;

function renderCampaigns() {
  const state = getState();
  const tbody = document.getElementById('meta-camp-tbody');
  if (!tbody) return;
  let list = state.metaCampaigns;
  const f = state.metaCampFilter;
  if (f !== 'ALL') list = list.filter(c => (c.effective_status || c.status) === f);
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--text2)">Sin campanas con ese filtro</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(c => {
    const ins = c.insights || {};
    const hasData = ins.spend > 0;
    const name = esc(c.name || '');
    return `<tr style="cursor:pointer" onclick="showAdsets('${c.id}','${name.replace(/'/g,"\\'")}')">
      <td><div style="font-weight:600;font-size:13px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${name}">${name}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:1px">${esc(c.objective || '')}</div></td>
      <td>${statusBadge(c.effective_status || c.status)}</td>
      <td style="font-weight:600">${hasData ? '$' + ins.spend : '—'}</td>
      <td><span style="font-weight:700;color:${roasColor(ins.roas)}">${ins.roas ? ins.roas + 'x' : '—'}</span></td>
      <td>${ins.purchases || '—'}</td>
      <td>${ins.cpa ? '$' + ins.cpa : '—'}</td>
      <td>${ins.ctr ? ins.ctr + '%' : '—'}</td>
      <td>${ins.cpm ? '$' + ins.cpm : '—'}</td>
      <td>${ins.impressions ? fmtNum(ins.impressions) : '—'}</td>
      <td><button class="btn btn-sm btn-outline" onclick="event.stopPropagation();snapshotCampaign('${c.id}','${name.replace(/'/g,"\\'")}')">📸</button></td>
    </tr>`;
  }).join('');
}

export async function showAdsets(campaignId, campaignName) {
  setState('currentCampaignId', campaignId);
  document.getElementById('meta-ads-section').style.display = 'none';
  const section = document.getElementById('meta-adsets-section');
  section.style.display = 'block';
  const title = document.getElementById('meta-adsets-title');
  if (title) title.textContent = 'Conjuntos — ' + esc(campaignName || '');
  const sub = document.getElementById('meta-adsets-sub');
  if (sub) sub.textContent = 'Cargando...';
  const tbody = document.getElementById('meta-adsets-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text2)"><span class="ld"></span><span class="ld"></span><span class="ld"></span></td></tr>';
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    await apiLoadAdsets(campaignId);
    if (sub) sub.textContent = `${getState().metaAdsets.length} conjuntos`;
    renderAdsets(campaignName);
  } catch (e) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--red);padding:16px">${esc(e.message)}</td></tr>`;
  }
}
window.showAdsets = showAdsets;

function renderAdsets(campName) {
  const state = getState();
  const tbody = document.getElementById('meta-adsets-tbody');
  if (!tbody) return;
  if (!state.metaAdsets.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text2)">Sin conjuntos</td></tr>';
    return;
  }
  tbody.innerHTML = state.metaAdsets.map(s => {
    const ins = s.insights || {};
    const name = esc(s.name || '');
    return `<tr style="cursor:pointer" onclick="showAds('${s.id}','${name.replace(/'/g,"\\'")}')">
      <td><div style="font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${name}">${name}</div></td>
      <td>${statusBadge(s.effective_status || s.status)}</td>
      <td style="font-weight:600">${ins.spend ? '$' + ins.spend : '—'}</td>
      <td><span style="font-weight:700;color:${roasColor(ins.roas)}">${ins.roas ? ins.roas + 'x' : '—'}</span></td>
      <td>${ins.purchases || '—'}</td>
      <td>${ins.cpa ? '$' + ins.cpa : '—'}</td>
      <td>${ins.ctr ? ins.ctr + '%' : '—'}</td>
      <td>${ins.cpm ? '$' + ins.cpm : '—'}</td>
      <td><button class="btn btn-sm btn-outline" onclick="event.stopPropagation();snapshotAdset('${s.id}','${name.replace(/'/g,"\\'")}')">📸</button></td>
    </tr>`;
  }).join('');
}

export function closeAdsets() {
  document.getElementById('meta-adsets-section').style.display = 'none';
  document.getElementById('meta-ads-section').style.display = 'none';
}
window.closeAdsets = closeAdsets;

export async function showAds(adsetId, adsetName) {
  setState('currentAdsetId', adsetId);
  const section = document.getElementById('meta-ads-section');
  section.style.display = 'block';
  const title = document.getElementById('meta-ads-title');
  if (title) title.textContent = 'Anuncios — ' + esc(adsetName || '');
  const sub = document.getElementById('meta-ads-sub');
  if (sub) sub.textContent = 'Cargando...';
  const tbody = document.getElementById('meta-ads-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--text2)"><span class="ld"></span><span class="ld"></span><span class="ld"></span></td></tr>';
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    await apiLoadAds(adsetId);
    if (sub) sub.textContent = `${getState().metaAds.length} anuncios`;
    renderAds(adsetName);
  } catch (e) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--red);padding:16px">${esc(e.message)}</td></tr>`;
  }
}
window.showAds = showAds;

function renderAds(adsetName) {
  const state = getState();
  const tbody = document.getElementById('meta-ads-tbody');
  if (!tbody) return;
  if (!state.metaAds.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text2)">Sin anuncios</td></tr>';
    return;
  }
  tbody.innerHTML = state.metaAds.map(a => {
    const ins = a.insights || {};
    const thumb = a.creative?.thumbnail_url;
    const name = esc(a.name || '');
    const hr = +ins.hook_rate || 0;
    const hookColor = hr >= 15 ? 'var(--green)' : hr >= 8 ? 'var(--blue)' : 'var(--amber)';
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          ${thumb ? `<img src="${thumb}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;flex-shrink:0" onerror="this.style.display='none'">` : ''}
          <div style="font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${name}">${name}</div>
        </div>
      </td>
      <td>${statusBadge(a.effective_status || a.status)}</td>
      <td style="font-weight:600">${ins.spend ? '$' + ins.spend : '—'}</td>
      <td><span style="font-weight:700;color:${roasColor(ins.roas)}">${ins.roas ? ins.roas + 'x' : '—'}</span></td>
      <td>${ins.purchases || '—'}</td>
      <td>${ins.cpa ? '$' + ins.cpa : '—'}</td>
      <td>${ins.ctr ? ins.ctr + '%' : '—'}</td>
      <td><span style="font-weight:600;color:${hookColor}">${ins.hook_rate ? ins.hook_rate + '%' : '—'}</span></td>
      <td>${ins.cpm ? '$' + ins.cpm : '—'}</td>
      <td><button class="btn btn-sm btn-accent" onclick="snapshotAd('${a.id}','${name.replace(/'/g,"\\'")}')">📸 Snap</button></td>
    </tr>`;
  }).join('');
}

export function closeAds() {
  document.getElementById('meta-ads-section').style.display = 'none';
}
window.closeAds = closeAds;

export async function snapshotCampaign(id, name) {
  const c = getState().metaCampaigns.find(x => x.id === id);
  if (!c) return;
  await saveMetricSnapshot(c.insights || {}, `[Camp] ${name}`, 'campaign', id);
  toast('Snapshot guardado ✓');
}
window.snapshotCampaign = snapshotCampaign;

export async function snapshotAdset(id, name) {
  const s = getState().metaAdsets.find(x => x.id === id);
  if (!s) return;
  await saveMetricSnapshot(s.insights || {}, `[Conj] ${name}`, 'adset', id);
  toast('Snapshot guardado ✓');
}
window.snapshotAdset = snapshotAdset;

export async function snapshotAd(id, name) {
  const a = getState().metaAds.find(x => x.id === id);
  if (!a) return;
  await saveMetricSnapshot(a.insights || {}, `[Anuncio] ${name}`, 'ad', id);
  toast('Snapshot guardado ✓');
}
window.snapshotAd = snapshotAd;

export async function autoSnapshot() {
  await apiAutoSnapshot();
}
window.autoSnapshot = autoSnapshot;

export function openMetaConfig() {
  const s = getState();
  const ti = document.getElementById('meta-token-input');
  const ai = document.getElementById('meta-account-input');
  if (ti) ti.value = s.META_TOKEN;
  if (ai) ai.value = s.META_ACCOUNT;
  openModal('modal-meta-config');
}
window.openMetaConfig = openMetaConfig;

export function saveMetaConfigFromUI() {
  apiSaveMetaConfig();
}
window.saveMetaConfigFromUI = saveMetaConfigFromUI;

export function deleteMetaToken() {
  setState('META_TOKEN', '');
  setState('META_ACCOUNT', '');
  localStorage.removeItem('gx_meta_token');
  localStorage.removeItem('lt_meta_account');
  toast('Token eliminado');
}
window.deleteMetaToken = deleteMetaToken;

export function openDateRange() {
  const wrap = document.getElementById('custom-date-wrap');
  if (wrap) wrap.style.display = wrap.style.display === 'none' ? 'flex' : 'none';
}
window.openDateRange = openDateRange;

export function applyDateRange() {
  loadMetaCampaigns();
}
window.applyDateRange = applyDateRange;

export function onDateRangeChange() {
  const val = document.getElementById('meta-date-range')?.value;
  const wrap = document.getElementById('custom-date-wrap');
  if (val === 'custom') {
    if (wrap) wrap.style.display = 'flex';
    const today = todayStr();
    const firstDay = today.substring(0, 8) + '01';
    const since = document.getElementById('meta-date-since');
    const until = document.getElementById('meta-date-until');
    if (since) since.value = firstDay;
    if (until) until.value = today;
  } else {
    if (wrap) wrap.style.display = 'none';
    loadMetaCampaigns();
  }
}
window.onDateRangeChange = onDateRangeChange;

export function showMetaRanking() {
  const state = getState();
  const camps = state.metaCampaigns.filter(c => c.insights && c.insights.spend > 0);
  const body = document.getElementById('meta-ranking-body');
  if (!body) return;
  if (!camps.length) {
    body.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text2)">Carga campanas primero</div>';
    return;
  }
  const sorted = [...camps].sort((a, b) => (b.insights.spend || 0) - (a.insights.spend || 0));
  body.innerHTML = sorted.map((c, i) => {
    const ins = c.insights || {};
    const name = esc(c.name || '');
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid var(--border)">
      <div style="width:24px;height:24px;border-radius:50%;background:#3a55b0;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i + 1}</div>
      <div style="flex:1;font-size:13px;font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${name}">${name}</div>
      <div style="text-align:right;font-size:12px;white-space:nowrap">
        <div>$${fmtN(ins.spend || 0)}</div>
        <div style="color:${roasColor(ins.roas)};font-weight:600">${ins.roas ? ins.roas + 'x' : '—'}</div>
      </div>
    </div>`;
  }).join('');
  openModal('modal-meta-ranking');
}
window.showMetaRanking = showMetaRanking;

// backward compat aliases
window.saveMetaConfig = window.saveMetaConfigFromUI;
window.loadMetaManual = function () { saveMetricSnapshot(); loadMetaCampaigns(); };
window.renderSnaps = function () {
  const { metrics } = getState();
  const list = document.getElementById('snap-list') || document.getElementById('meta-snaps');
  if (!list) return;
  const snaps = (metrics || []).slice(0, 50);
  list.innerHTML = snaps.length ? snaps.map(s => `
    <div class="snap-row" style="display:flex;align-items:center;gap:10px;padding:8px;border-bottom:0.5px solid var(--border);font-size:12px">
      <span style="flex:1;font-weight:600">${esc(s.campaign_name || s.ad_name || s.tipo || 'Métrica')}</span>
      <span>$${fmtN(s.inversion||0)}</span>
      <span style="color:${roasColor(s.roas)}">${s.roas ? s.roas+'x' : '—'}</span>
      <span style="font-size:10px;color:var(--text2)">${s.fecha ? new Date(s.fecha).toLocaleDateString('es-AR') : ''}</span>
    </div>`).join('') : '<div style="text-align:center;padding:20px;color:var(--text2)">Sin snapshots</div>';
};
window.newScript = function () {
  import('./objetivos.js').then(m => m.openAddScript ? m.openAddScript() : null);
};
