import { getState } from './utils/state.js';
import { supabase } from './services/supabase.js';

const pageMap = {
  dashboard: { id: 'page-dashboard', perm: null, nav: 'nav-dashboard' },
  meta:     { id: 'page-meta',     perm: 'meta',     nav: 'nav-meta' },
  finanzas: { id: 'page-finanzas', perm: 'finanzas', nav: 'nav-finanzas' },
  contenido:{ id: 'page-contenido',perm: 'contenido', nav: 'nav-contenido' },
  objetivos:{ id: 'page-objetivos',perm: null,        nav: 'nav-objetivos' },
  ia:       { id: 'page-ia',       perm: 'ia',       nav: 'nav-ia' },
  config:   { id: 'page-config',   perm: null,       nav: 'nav-config' },
  admin:    { id: 'page-config',   perm: null,       nav: 'nav-admin' },
};

export function checkAccess(page) {
  const { userProfile } = getState();
  if (!userProfile) return false;
  if (userProfile.admin) return true;
  if (page === 'dashboard' || page === 'objetivos' || page === 'config') return true;
  const perms = userProfile.permissions || [];
  const info = pageMap[page];
  if (!info || !info.perm) return true;
  return perms.includes(info.perm);
}

export function navigateTo(page) {
  if (!checkAccess(page)) {
    toast('No tenés acceso a esta sección');
    return;
  }
  const info = pageMap[page];
  if (!info) return;

  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById(info.id);
  if (section) section.classList.add('active');

  const navEl = document.getElementById(info.nav);
  if (navEl) navEl.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (page === 'meta') {
    import('./pages/meta-ads.js').then(m => m.loadMetaCampaigns());
  } else if (page === 'finanzas') {
    import('./pages/finanzas.js').then(m => m.loadFinanzas());
  } else if (page === 'contenido') {
    import('./pages/contenido.js').then(m => m.loadContenido());
  } else if (page === 'objetivos') {
    import('./pages/objetivos.js').then(m => m.loadObjetivos());
  } else if (page === 'ia') {
    import('./pages/ia-consultor.js').then(m => { if (m.initIA) m.initIA(); });
  } else if (page === 'dashboard') {
    import('./pages/dashboard.js').then(m => m.loadDashboard());
  } else if (page === 'config') {
    import('./pages/config.js').then(m => m.loadConfig());
  }
}

function toast(msg) {
  const el = document.getElementById('toast-container');
  if (!el) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  t.style.cssText = 'background:#1e293b;color:#f8fafc;padding:10px 16px;border-radius:8px;margin-top:8px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,0.3);animation:slideIn 0.2s ease';
  el.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2500);
}

window.navigateTo = navigateTo;
window.checkAccess = checkAccess;
window.showPage = navigateTo;
window.signOut = function() { import('./pages/auth.js').then(m => m.handleLogout ? m.handleLogout() : null); };
export default { navigateTo, checkAccess };
