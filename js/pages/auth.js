import { getState, setState, onStateChange } from '../utils/state.js';
import { supabase, signIn, signUp, signOut, fetchMetrics, fetchUserProfile, createUserProfile } from '../services/supabase.js';
import { renderAlertCenter } from '../components/alert-center.js';
import { renderBusinessScore } from '../components/business-score.js';
import { navigateTo } from '../router.js';
import { openModal, closeModal, todayStr, esc, fmtN, toast } from '../utils/helpers.js';

window.showSignUp = function () {
  document.getElementById('auth-section').classList.remove('signin-mode');
  document.getElementById('auth-section').classList.add('signup-mode');
};

window.showSignIn = function () {
  document.getElementById('auth-section').classList.remove('signup-mode');
  document.getElementById('auth-section').classList.add('signin-mode');
};

window.handleSignIn = async function () {
  const email = document.getElementById('auth-email').value;
  const pass = document.getElementById('auth-pass').value;
  const { error } = await signIn(email, pass);
  if (error) {
    document.getElementById('auth-error').textContent = error.message;
    return;
  }
};

window.handleSignUp = async function () {
  const email = document.getElementById('auth-email').value;
  const pass = document.getElementById('auth-pass').value;
  const nombre = document.getElementById('auth-name').value;
  const { data, error } = await signUp(email, pass, nombre);
  if (error) {
    document.getElementById('auth-error').textContent = error.message;
    return;
  }
  if (data?.user) {
    await createUserProfile(data.user.id, { nombre, email });
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('setup-form').style.display = 'block';
  }
};

window.handleLogout = async function () {
  await signOut();
  navigateTo('auth');
};

window.switchTab = function (tab) {
  if (tab === 'register') { window.showSignUp(); } else { window.showSignIn(); }
};
window.doAuth = async function () {
  const isRegister = document.getElementById('auth-section').classList.contains('signup-mode');
  if (isRegister) { await window.handleSignUp(); } else { await window.handleSignIn(); }
};
window.showSetup = function () {
  document.getElementById('setup-form').style.display = 'block';
  document.getElementById('auth-form').style.display = 'none';
};
window.saveConfig = async function () {
  const url = document.getElementById('setup-sb-url').value;
  const key = document.getElementById('setup-sb-key').value;
  if (url && key) { localStorage.setItem('gx_sb_url', url); localStorage.setItem('gx_sb_key', key); }
  toast('Configuración guardada. Recarga la página.');
};
window.signOut = window.handleLogout;

window.handleSetupComplete = async function () {
  const user = getState().me;
  if (!user) return;
  const brand = document.getElementById('setup-brand').value;
  const industry = document.getElementById('setup-industry').value;
  const goal = document.getElementById('setup-goal').value;
  await supabase.from('user_profiles').update({ brand_name: brand, industry, goal }).eq('id', user.id);
  const profile = await fetchUserProfile(user.id);
  setState('userProfile', profile);
  toast('Configuración guardada');
  navigateTo('dashboard');
};
