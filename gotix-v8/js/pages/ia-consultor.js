import { getState, setState } from '../utils/state.js';
import { fmtN, fmtDate, esc, toast, todayStr } from '../utils/helpers.js';
import { buildCtx, sendIA, appendMsg, clearIA } from '../services/ai.js';

export function initIA() {
  const ctx = buildCtx();
  const ctxEl = document.getElementById('ia-context');
  if (ctxEl) ctxEl.innerHTML = '<pre style="font-size:12px;line-height:1.6;color:var(--text2);white-space:pre-wrap">' + esc(ctx || 'No hay datos cargados.') + '</pre>';
  loadIAHistory();
  const el = document.getElementById('ia-chat');
  if (el && !el.children.length) {
    appendIAChat('Hola! Soy tu asistente estratégico. Tengo acceso a tus métricas, guiones y objetivos del mes. ¿En qué puedo ayudarte?', false);
  }
  const key = localStorage.getItem('gx_anthropic_key');
  const warn = document.getElementById('ia-key-warn');
  if (warn) warn.style.display = key ? 'none' : 'block';
}
window.initIA = initIA;

export function sendIAMessage() {
  const inp = document.getElementById('ia-input');
  if (!inp) return;
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  appendIAChat(esc(msg), true);
  const typing = appendIAChat('<span class="ld"></span><span class="ld"></span><span class="ld"></span>', false);
  if (typing) typing.id = 'ia-typing';
  sendIA(msg).then(reply => {
    const t = document.getElementById('ia-typing');
    if (t) t.remove();
    appendIAChat(reply.replace(/\n/g, '<br>'), false);
  }).catch(e => {
    const t = document.getElementById('ia-typing');
    if (t) t.remove();
    appendIAChat('Error: ' + esc(e.message), false);
  });
}
window.sendIAMessage = sendIAMessage;

export function appendIAChat(msg, isUser) {
  const el = document.getElementById('ia-chat');
  if (!el) return null;
  const div = document.createElement('div');
  div.className = 'msg';
  if (isUser) {
    div.classList.add('user');
  } else {
    div.classList.add('assistant');
  }
  div.innerHTML = msg;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
  return div;
}
window.appendIAChat = appendIAChat;

export function clearIAChat() {
  clearIA();
  const el = document.getElementById('ia-chat');
  if (el) el.innerHTML = '';
  initIA();
}
window.clearIAChat = clearIAChat;

export function loadIAHistory() {
  const history = getState().iaHistory || [];
  const el = document.getElementById('ia-chat');
  if (!el) return;
  history.forEach(h => {
    appendIAChat(h.content, h.role === 'user');
  });
}
window.loadIAHistory = loadIAHistory;

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && document.activeElement === document.getElementById('ia-input')) {
    e.preventDefault();
    sendIAMessage();
  }
});
