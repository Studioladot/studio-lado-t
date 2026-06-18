import { getState, setState } from '../utils/state.js';
import { fmtN, fmtDate, esc, toast, todayStr, openModal, closeModal } from '../utils/helpers.js';
import { supabase, fetchUserProfile, createUserProfile, fetchAllUsers, fetchFinConfig, fetchNotas, saveNota, deleteNota as deleteNotaService, fetchMetrics } from '../services/supabase.js';
import { saveMetaConfig, verifyMetaConnection, deleteMetaToken as clearMetaToken } from '../services/meta-ads.js';

export function loadConfig() {
  const u = getState().me;
  if (u) {
    const ne = document.getElementById('config-user-name');
    const ee = document.getElementById('config-user-email');
    if (ne) ne.textContent = u.user_metadata?.nombre_completo || u.email || '—';
    if (ee) ee.textContent = u.email || '—';
  }
  const surl = document.getElementById('gx-sb-url');
  const skey = document.getElementById('gx-sb-key');
  if (surl) surl.value = localStorage.getItem('gx_sb_url') || getState().SBURL || '';
  if (skey) skey.value = localStorage.getItem('gx_sb_key') || getState().SBKEY || '';
  const ak = document.getElementById('gx-anthropic-key');
  if (ak) ak.value = localStorage.getItem('gx_anthropic_key') || '';
  const mt = document.getElementById('meta-token');
  const ma = document.getElementById('meta-account-id');
  if (mt) mt.value = localStorage.getItem('gx_meta_token') || '';
  if (ma) ma.value = localStorage.getItem('lt_meta_account') || '';
  loadNotas();
  loadBenchmarks();
}
window.loadConfig = loadConfig;

export function saveGxKeys() {
  const url = document.getElementById('gx-sb-url')?.value.trim();
  const key = document.getElementById('gx-sb-key')?.value.trim();
  if (!url || !key) { toast('Completa URL y Key'); return; }
  localStorage.setItem('gx_sb_url', url);
  localStorage.setItem('gx_sb_key', key);
  setState('SBURL', url);
  setState('SBKEY', key);
  toast('Credenciales Supabase guardadas');
}
window.saveGxKeys = saveGxKeys;

export function saveAnthropicKey() {
  const key = document.getElementById('gx-anthropic-key')?.value.trim();
  if (!key) { toast('Ingresa la API key'); return; }
  localStorage.setItem('gx_anthropic_key', key);
  setState('APIKEY', key);
  toast('API key de Anthropic guardada');
  const warn = document.getElementById('ia-key-warn');
  if (warn) warn.style.display = 'none';
}
window.saveAnthropicKey = saveAnthropicKey;

export function saveMetaConfigFromUI() {
  const token = document.getElementById('meta-token')?.value.trim();
  const account = document.getElementById('meta-account-id')?.value.trim().replace('act_', '');
  if (!token || !account) { toast('Completa token y account ID'); return; }
  saveMetaConfig(token, account);
  toast('Meta config guardada');
}
window.saveMetaConfigFromUI = saveMetaConfigFromUI;

export function deleteMetaToken() {
  localStorage.removeItem('gx_meta_token');
  localStorage.removeItem('lt_meta_account');
  setState('META_TOKEN', '');
  setState('META_ACCOUNT', '');
  const mt = document.getElementById('meta-token');
  const ma = document.getElementById('meta-account-id');
  if (mt) mt.value = '';
  if (ma) ma.value = '';
  toast('Meta token eliminado');
}
window.deleteMetaToken = deleteMetaToken;

export async function loadUsers() {
  const list = document.getElementById('admin-user-list');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text2)">Cargando...</div>';
  try {
    const users = await fetchAllUsers();
    if (!users.length) {
      list.innerHTML = '<div class="empty"><div class="empty-msg">Sin usuarios</div></div>';
      return;
    }
    list.innerHTML = '<div class="tbl-wrap"><table><thead><tr><th>Nombre</th><th>Email</th><th>WhatsApp</th><th>Admin</th><th>Acciones</th></tr></thead><tbody>' +
      users.map(u => {
        const perms = u.permissions || [];
        return '<tr>' +
          '<td>' + esc(u.nombre_completo || '—') + '</td>' +
          '<td>' + esc(u.email || '—') + '</td>' +
          '<td>' + esc(u.whatsapp || '—') + '</td>' +
          '<td><button class="btn btn-sm ' + (u.is_admin ? 'btn-accent' : 'btn-outline') + '" onclick="toggleAdmin(\'' + u.id + '\',' + (u.is_admin ? 'false' : 'true') + ')">' + (u.is_admin ? 'Sí' : 'No') + '</button></td>' +
          '<td>' +
            '<button class="btn btn-sm btn-outline" onclick="saveUserProfile(\'' + u.id + '\')">Guardar</button> ' +
            '<button class="btn btn-sm btn-red" onclick="deleteUser(\'' + u.id + '\')">Eliminar</button>' +
          '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  } catch (e) {
    list.innerHTML = '<div style="text-align:center;padding:16px;color:var(--red)">Error: ' + esc(e.message) + '</div>';
  }
}
window.loadUsers = loadUsers;

export async function togglePermission(userId, perm, btn) {
  try {
    const profile = await fetchUserProfile(userId);
    const perms = profile?.permissions || [];
    const idx = perms.indexOf(perm);
    if (idx >= 0) perms.splice(idx, 1);
    else perms.push(perm);
    await supabase.from('user_profiles').update({ permissions: perms }).eq('id', userId);
    if (btn) btn.classList.toggle('active');
    toast('Permiso actualizado');
  } catch (e) {
    toast('Error: ' + e.message);
  }
}
window.togglePermission = togglePermission;

export async function toggleAdmin(userId, makeAdmin) {
  try {
    await supabase.from('user_profiles').update({ is_admin: makeAdmin }).eq('id', userId);
    toast('Admin ' + (makeAdmin ? 'activado' : 'desactivado'));
    loadUsers();
  } catch (e) {
    toast('Error: ' + e.message);
  }
}
window.toggleAdmin = toggleAdmin;

export async function saveUserProfile(userId) {
  try {
    const row = document.querySelector('#admin-user-list tr[data-id="' + userId + '"]');
    const data = {};
    if (row) {
      const inputs = row.querySelectorAll('[data-field]');
      inputs.forEach(inp => { data[inp.dataset.field] = inp.value; });
    }
    await supabase.from('user_profiles').update(data).eq('id', userId);
    toast('Perfil guardado');
  } catch (e) {
    toast('Error: ' + e.message);
  }
}
window.saveUserProfile = saveUserProfile;

export async function deleteUser(userId) {
  if (!confirm('¿Eliminar este usuario definitivamente?')) return;
  try {
    await supabase.from('user_profiles').delete().eq('id', userId);
    toast('Usuario eliminado');
    loadUsers();
  } catch (e) {
    toast('Error: ' + e.message);
  }
}
window.deleteUser = deleteUser;

export async function loadNotas() {
  const grid = document.getElementById('notes-grid');
  if (!grid) return;
  const user = getState().me;
  if (!user) return;
  try {
    const notas = await fetchNotas(user.id);
    setState('notas', notas);
    if (!notas.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">&#128221;</div><div class="empty-msg">Sin notas todavía</div><div class="empty-sub">Escribí lo que se te ocurra</div></div>';
      return;
    }
    grid.innerHTML = notas.map(n => {
      const color = n.color || '#f0efec';
      return '<div class="card" style="background:' + color + ';border-color:' + color + ';position:relative;padding:14px 16px">' +
        '<div style="font-weight:700;margin-bottom:6px;font-size:14px">' + esc(n.titulo || 'Sin título') + '</div>' +
        '<div style="font-size:13px;line-height:1.6;margin-bottom:10px">' + esc(n.contenido || '').replace(/\n/g, '<br>') + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text2)">' +
          '<span>' + fmtDate(n.created_at) + '</span>' +
          '<button class="btn btn-sm btn-ghost" onclick="deleteNota(\'' + n.id + '\')" style="color:var(--red)">&#128465;</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (e) {
    grid.innerHTML = '<div style="text-align:center;padding:16px;color:var(--red)">Error: ' + esc(e.message) + '</div>';
  }
}
window.loadNotas = loadNotas;

export function openAddNota() {
  document.getElementById('nota-titulo').value = '';
  document.getElementById('nota-contenido').value = '';
  openModal('modal-nota');
}
window.openAddNota = openAddNota;

export async function saveNotaFromUI() {
  const titulo = document.getElementById('nota-titulo')?.value.trim();
  const contenido = document.getElementById('nota-contenido')?.value.trim();
  const color = document.getElementById('nota-color')?.value || '#fef3d8';
  const user = getState().me;
  if (!user) { toast('Debes iniciar sesión'); return; }
  if (!contenido) { toast('Escribí algo en la nota'); return; }
  try {
    await saveNota({ titulo, contenido, color, user_id: user.id });
    closeModal('modal-nota');
    toast('Nota guardada');
    loadNotas();
  } catch (e) {
    toast('Error: ' + e.message);
  }
}
window.saveNotaFromUI = saveNotaFromUI;

export async function deleteNota(notaId) {
  if (!confirm('¿Eliminar esta nota?')) return;
  try {
    await deleteNotaService(notaId);
    toast('Nota eliminada');
    loadNotas();
  } catch (e) {
    toast('Error: ' + e.message);
  }
}
window.deleteNota = deleteNota;

export function openDeleteConfirm() {
  openModal('modal-delete-account');
}
window.openDeleteConfirm = openDeleteConfirm;

export async function deleteAccount() {
  if (!confirm('¿Estás seguro? Esta acción no se puede deshacer.')) return;
  try {
    const user = getState().me;
    if (user) {
      await supabase.from('user_profiles').delete().eq('id', user.id);
      await supabase.auth.admin.deleteUser(user.id);
    }
    await supabase.auth.signOut();
    setState('me', null);
    toast('Cuenta eliminada');
    location.reload();
  } catch (e) {
    toast('Error: ' + e.message);
  }
}
window.deleteAccount = deleteAccount;

export function loadBenchmarks() {
  const metrics = getState().metrics || [];
  const recent = metrics.slice(0, 30);
  const avg = (fn) => {
    const vals = recent.map(fn).filter(v => v != null && !isNaN(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const data = {
    hook_rate: avg(m => +m.hook_rate || 0),
    ctr: avg(m => +m.ctr || 0),
    roas: avg(m => +m.roas || 0),
    cpa: avg(m => +m.cpa || 0),
    cpm: avg(m => +m.cpm || 0),
    frequency: avg(m => +m.frequency || 0),
    p25: avg(m => +m.p25 || 0),
    p100: avg(m => +m.p100 || 0),
  };
  setState('benchmarks', data);
  const el = document.getElementById('benchmark-charts');
  if (!el) return;
  const targets = getState().benchmarkTargets || {};
  el.innerHTML = '<div class="grid-2">' + Object.entries(data).map(([k, v]) => {
    const t = targets[k];
    const pct = t && t > 0 ? Math.round((v / t) * 100) : null;
    return '<div class="card" style="padding:12px 14px">' +
      '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text2);margin-bottom:4px">' + k.replace(/_/g, ' ') + '</div>' +
      '<div style="display:flex;align-items:baseline;gap:8px">' +
        '<span style="font-size:22px;font-weight:700">' + fmtN(v) + '</span>' +
        (t ? '<span style="font-size:12px;color:var(--text3)">objetivo: ' + fmtN(t) + '</span>' : '') +
      '</div>' +
      (pct !== null ? '<div style="margin-top:6px"><div style="height:4px;background:var(--surface2);border-radius:2px;overflow:hidden"><div style="height:100%;width:' + Math.min(pct, 100) + '%;background:' + (pct >= 100 ? 'var(--green)' : pct >= 75 ? 'var(--blue)' : 'var(--amber)') + ';border-radius:2px;transition:width .4s"></div></div></div>' : '') +
    '</div>';
  }).join('') + '</div>';
}
window.loadBenchmarks = loadBenchmarks;

// backward compat aliases
window.saveBenchmarks = function () {
  const el = document.getElementById('benchmark-charts');
  const targets = {};
  if (el) el.querySelectorAll('.card').forEach(c => {
    const label = c.querySelector('[style*="text-transform"]')?.textContent?.trim().replace(/\s+/g, '_');
    const inp = c.querySelector('input');
    if (label && inp) targets[label] = +inp.value || 0;
  });
  setState('benchmarkTargets', targets);
  toast('Targets guardados');
};
window.openNewNota = function () { openAddNota(); };
window.selNotaColor = function (color, el) {
  document.querySelectorAll('#modal-nota [style*="border-radius:50%"]').forEach(d => d.style.borderColor = 'transparent');
  if (el) el.style.borderColor = 'var(--accent)';
  const inp = document.getElementById('nota-color');
  if (inp) inp.value = color;
};
