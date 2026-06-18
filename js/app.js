import { getState, setState, onStateChange } from './utils/state.js';
import { supabase, initSupabase, fetchMetrics, fetchObjectives, fetchFinConfig, fetchUserProfile } from './services/supabase.js';
import { initMeta } from './services/meta-ads.js';
import { startAutoScan } from './services/alerts.js';
import { renderAlertCenter } from './components/alert-center.js';
import { renderBusinessScore } from './components/business-score.js';

let initialized = false;

export async function initApp() {
  if (initialized) return;
  initialized = true;

  initSupabase();

  const hash = location.hash.replace('#', '');
  setState({ currentPage: hash || 'dashboard' });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setState({ me: session.user });
      await loadAll();
      navigateTo(hash || 'dashboard');
    } else {
      document.getElementById('auth-section').classList.add('active');
    }
  } catch (e) {
    console.error('Init error:', e);
    document.getElementById('auth-section').classList.add('active');
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      setState({ me: session.user });
      document.getElementById('auth-section').classList.remove('active');
      document.getElementById('auth-section').classList.remove('visible');
      await loadAll();
      navigateTo('dashboard');
    } else if (event === 'SIGNED_OUT') {
      setState({ me: null, userProfile: null });
      document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById('auth-section').classList.add('active');
      document.getElementById('auth-section').classList.add('visible');
    }
  });

  setupSidebar();
  setupNavClicks();
}

async function loadAll() {
  const { me } = getState();
  if (!me) return;

  try {
    const profile = await fetchUserProfile(user.id);
    setState({ userProfile: profile });
  } catch (e) { console.error('Profile load error:', e); }

  try {
    const metrics = await fetchMetrics();
    setState({ metrics });
  } catch (e) { console.error('Metrics load error:', e); }

  try {
    const objetivos = await fetchObjectives();
    setState({ objetivos });
  } catch (e) { console.error('Obj load error:', e); }

  try {
    const finConfig = await fetchFinConfig();
    setState({ config: { ...getState().config, ...finConfig } });
  } catch (e) { console.error('Fin config load error:', e); }

  initMeta();
  startAutoScan();

  updateUserUI();

  renderAlertCenter();
  renderBusinessScore();

  loadScriptsAsync();
  loadIdeasAsync();
  loadPostsAsync();
}

function updateUserUI() {
  const { me, userProfile } = getState();
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');
  if (nameEl) nameEl.textContent = userProfile?.nombre || me?.email || '';
  if (emailEl) nameEl && (nameEl.textContent = userProfile?.nombre || me?.email || '');
  if (emailEl) emailEl.textContent = me?.email || '';
  if (avatarEl) avatarEl.textContent = (userProfile?.nombre || me?.email || 'U')[0].toUpperCase();
}

async function loadScriptsAsync() {
  try {
    const { fetchScripts } = await import('./services/supabase.js');
    const scripts = await fetchScripts();
    setState({ scripts });
  } catch (e) { console.error('Scripts load error:', e); }
}

async function loadIdeasAsync() {
  try {
    const { fetchIdeas } = await import('./services/supabase.js');
    const ideas = await fetchIdeas();
    setState({ ideas });
  } catch (e) { console.error('Ideas load error:', e); }
}

async function loadPostsAsync() {
  try {
    const { fetchPosts, fetchContacts, fetchContentCamps, fetchContentPiezas } = await import('./services/supabase.js');
    const [posts, contacts, camps, piezas] = await Promise.all([
      fetchPosts(), fetchContacts(), fetchContentCamps(), fetchContentPiezas()
    ]);
    setState({ posts, contacts, contentCamps: camps, contentPiezas: piezas });
  } catch (e) { console.error('Posts load error:', e); }
}

function setupSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
  }
  const sidebarLinks = document.querySelectorAll('[data-nav]');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.nav;
      navigateTo(page);
    });
  });
}

function setupNavClicks() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.nav);
    });
  });
}

window.loadAll = loadAll;
window.initApp = initApp;

document.addEventListener('DOMContentLoaded', () => initApp());

export default { initApp, loadAll };
