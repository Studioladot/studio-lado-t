import state, { setState } from '../utils/state.js';
import { toast, fmtNum } from '../utils/helpers.js';
import { safeInsertMetric } from './supabase.js';

export function metaGet(path, params = {}) {
  const p = new URLSearchParams({ ...params, access_token: state.META_TOKEN });
  return fetch(`${state.GRAPH}/${path}?${p}`).then(r => r.json());
}

export function parseInsights(ins) {
  if (!ins || !ins.length) return {};
  const d = ins[0];
  const actions = d.actions || [];
  const actVals = d.action_values || [];
  const purchases = actions.find(a => a.action_type === 'purchase')?.value || 0;
  const revenue = actVals.find(a => a.action_type === 'purchase')?.value || 0;
  const spend = +d.spend || 0;
  const roas = spend > 0 && revenue > 0 ? (revenue / spend).toFixed(2) : 0;
  const cpa = purchases > 0 ? (spend / purchases).toFixed(2) : 0;
  const hook = (() => {
    const p3 = d.video_play_actions?.find(a => a.action_type === 'video_view')?.value || 0;
    const impr = +d.impressions || 0;
    return impr > 0 ? ((p3 / impr) * 100).toFixed(1) : 0;
  })();
  return {
    spend: spend.toFixed(2),
    roas: +roas,
    purchases: +purchases,
    revenue: (+revenue).toFixed(2),
    cpa: +cpa,
    ctr: (+d.ctr || 0).toFixed(2),
    cpm: (+d.cpm || 0).toFixed(2),
    cpc: (+d.cpc || 0).toFixed(2),
    frequency: (+d.frequency || 0).toFixed(2),
    impressions: +d.impressions || 0,
    clicks: +d.clicks || 0,
    hook_rate: +hook,
    p25: d.video_p25_watched_actions?.[0]?.value || 0,
    p75: d.video_p75_watched_actions?.[0]?.value || 0,
    p100: d.video_p100_watched_actions?.[0]?.value || 0,
  };
}

export function getDateRangeParams() {
  const days = document.getElementById('meta-date-range')?.value || 'last_30d';
  const since = document.getElementById('meta-date-since')?.value;
  const until = document.getElementById('meta-date-until')?.value;
  const isCustom = days === 'custom';
  return { days, since, until, isCustom };
}

export function getInsightsParam(days, since, until, isCustom) {
  return isCustom
    ? `insights.time_range({"since":"${since}","until":"${until}"}){${state.AD_FIELDS}}`
    : `insights.date_preset(${days}){${state.AD_FIELDS}}`;
}

export async function loadMetaCampaigns() {
  if (!state.META_TOKEN || !state.META_ACCOUNT) {
    document.getElementById('meta-camp-empty-msg').textContent = 'Conecta tu cuenta en "Conectar Meta" primero';
    return;
  }
  const { days, since, until, isCustom } = getDateRangeParams();
  const tbody = document.getElementById('meta-camp-tbody');

  if (isCustom && (!since || !until)) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--text2)">Seleccioná las fechas del rango personalizado</td></tr>';
    return;
  }

  const insParam = getInsightsParam(days, since, until, isCustom);
  try {
    const data = await metaGet(`act_${state.META_ACCOUNT}/campaigns`, {
      fields: `${state.CAMP_FIELDS},${insParam}`,
      limit: 50,
    });
    if (data.error) throw new Error(data.error.message);
    setState('metaCampaigns', (data.data || []).map(c => ({
      ...c,
      insights: parseInsights(c.insights?.data)
    })));
    return state.metaCampaigns;
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--red)">Error: ${e.message}</td></tr>`;
  }
}

export async function loadAdsets(campaignId) {
  const { days, since, until, isCustom } = getDateRangeParams();
  const insParam = getInsightsParam(days, since, until, isCustom);
  try {
    const data = await metaGet(`${campaignId}/adsets`, {
      fields: `${state.ADSET_FIELDS},${insParam}`,
      limit: 50,
    });
    if (data.error) throw new Error(data.error.message);
    const adsets = (data.data || []).map(s => ({ ...s, insights: parseInsights(s.insights?.data) }));
    setState('metaAdsets', adsets);
    return adsets;
  } catch (e) {
    throw e;
  }
}

export async function loadAds(adsetId) {
  const { days, since, until, isCustom } = getDateRangeParams();
  const insParam = getInsightsParam(days, since, until, isCustom);
  try {
    const data = await metaGet(`${adsetId}/ads`, {
      fields: `${state.AD_INFO_FIELDS},${insParam}`,
      limit: 50,
    });
    if (data.error) throw new Error(data.error.message);
    const ads = (data.data || []).map(a => ({ ...a, insights: parseInsights(a.insights?.data) }));
    setState('metaAds', ads);
    return ads;
  } catch (e) {
    throw e;
  }
}

export async function saveMetricSnapshot(ins, name, snap_type, meta_id) {
  const now = new Date();
  const timeLabel = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const rec = {
    user_id: state.me.id,
    name: `[${timeLabel}] ${name}`,
    spend: +ins.spend || 0, roas: +ins.roas || 0,
    purchases: +ins.purchases || 0, cpa: +ins.cpa || 0,
    ctr: +ins.ctr || 0, cpm: +ins.cpm || 0, cpc: +ins.cpc || 0,
    frequency: +ins.frequency || 0, hook_rate: +ins.hook_rate || 0,
    snapshot_date: now.toISOString().split('T')[0],
    notes: `Snapshot ${timeLabel} | Tipo: ${snap_type} | ID: ${meta_id}`,
    snap_type, meta_id, snap_time: now.toISOString()
  };
  const row = await safeInsertMetric(rec);
  if (row) state.metrics.unshift(row);
  return row;
}

export async function autoSnapshot() {
  if (!state.META_TOKEN || !state.META_ACCOUNT) { toast('Conecta Meta primero'); return; }
  if (!state.metaCampaigns.length) { toast('Carga campanas primero'); return; }
  const now = new Date();
  const timeLabel = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toISOString().split('T')[0];
  let saved = 0, lastErr = '';
  const activeCamps = state.metaCampaigns.filter(c => (c.effective_status || c.status) === 'ACTIVE');
  const toSnap = activeCamps.length ? activeCamps : state.metaCampaigns.slice(0, 10);
  toast(`Guardando ${toSnap.length} snapshots...`);
  for (const c of toSnap) {
    const ins = c.insights || {};
    if (!ins.spend || +ins.spend === 0) continue;
    const rec = {
      user_id: state.me.id,
      name: `[${timeLabel}] ${c.name}`,
      spend: +ins.spend || 0, roas: +ins.roas || 0,
      purchases: +ins.purchases || 0, cpa: +ins.cpa || 0,
      ctr: +ins.ctr || 0, cpm: +ins.cpm || 0, cpc: +ins.cpc || 0,
      frequency: +ins.frequency || 0, hook_rate: +ins.hook_rate || 0,
      snapshot_date: dateStr,
      notes: `Auto-snapshot ${timeLabel} | Campana ID: ${c.id} | Estado: ${c.effective_status || c.status}`,
      snap_type: 'campaign', meta_id: c.id, snap_time: now.toISOString()
    };
    try {
      const row = await safeInsertMetric(rec);
      if (row) { state.metrics.unshift(row); saved++; }
    } catch (e2) { lastErr = e2.message; }
  }
  if (saved > 0) toast(`✓ ${saved} snapshot${saved > 1 ? 's' : ''} guardado${saved > 1 ? 's' : ''} a las ${timeLabel}`);
  else toast('⚠ 0 guardados' + (lastErr ? ' — ' + lastErr.slice(0, 80) : ' — verifica gasto en el periodo'), 5000);
}

export async function verifyMetaConnection() {
  const statusEl = document.getElementById('meta-connect-status');
  const infoEl = document.getElementById('meta-account-info');
  if (!statusEl || !infoEl) return;
  statusEl.innerHTML = '<span style="color:var(--text2)">Verificando...</span>';
  try {
    const data = await metaGet(`act_${state.META_ACCOUNT}`, { fields: 'name,account_status,currency,spend_cap,amount_spent' });
    if (data.error) throw new Error(data.error.message);
    statusEl.innerHTML = '<span style="color:var(--green)">✓ Conectado correctamente</span>';
    infoEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div><div style="font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase">Cuenta</div><div style="font-size:15px;font-weight:700">${data.name}</div></div>
        <div><div style="font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase">Moneda</div><div style="font-size:14px;font-weight:600">${data.currency}</div></div>
        <button class="btn btn-teal" onclick="loadMetaCampaigns(); showPage('meta-campanas')" style="margin-top:4px">Ver campanas →</button>
      </div>`;
    toast('Meta Ads conectado ✓');
  } catch (e) {
    if (e.message && (e.message.includes('400') || e.message.includes('token'))) {
      setState('META_TOKEN', '');
      localStorage.removeItem('gx_meta_token');
    }
    statusEl.innerHTML = `<span style="color:var(--red)">Token expirado — ve a Conectar Meta y pega uno nuevo</span>`;
    infoEl.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-msg">Error de conexion</div><div class="empty-sub">${e.message}</div></div>`;
  }
}

export function saveMetaConfig() {
  const token = document.getElementById('meta-token-input').value.trim();
  const account = document.getElementById('meta-account-input').value.trim().replace('act_', '');
  if (!token || !account) { toast('Ingresa token y account ID'); return; }
  setState('META_TOKEN', token);
  setState('META_ACCOUNT', account);
  localStorage.setItem('gx_meta_token', token);
  localStorage.setItem('lt_meta_account', account);
  verifyMetaConnection();
}

export function initMeta() {
  const token = localStorage.getItem('gx_meta_token') || '';
  const account = localStorage.getItem('lt_meta_account') || '';
  setState('META_TOKEN', token);
  setState('META_ACCOUNT', account);
  const ti = document.getElementById('meta-token-input');
  const ai = document.getElementById('meta-account-input');
  if (ti) ti.value = token;
  if (ai) ai.value = account;
}
