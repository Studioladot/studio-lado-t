import state from '../utils/state.js';
import { fmtNum } from '../utils/helpers.js';

export function buildCtx() {
  const parts = [];
  if (state.metrics.length) {
    const r = state.metrics.slice(0, 5);
    parts.push('Ultimas metricas: ' + r.map(m =>
      m.name + ': ROAS ' + m.roas + 'x, gasto $' + m.spend + ', compras ' + m.purchases +
      ', CTR ' + m.ctr + '%, CPA $' + m.cpa + ', hook ' + m.hook_rate + '%, P25 ' + m.p25 + '%, P100 ' + m.p100 + '%'
    ).join(' | '));
  }
  if (state.objectives.length) {
    parts.push('Objetivos del mes: ' + state.objectives.map(o =>
      o.name + ' (' + o.current_val + '/' + o.target + ' ' + o.unit + ')'
    ).join(', '));
  }
  const activos = state.scripts.filter(s => s.status === 'activo' || s.status === 'ganador');
  if (activos.length) {
    parts.push('Guiones activos/ganadores: ' + activos.map(s => s.title).join(', '));
  }
  if (state.finances.length) {
    parts.push('Profit registrado: $' + fmtNum(state.finances.reduce((a, f) => a + (+f.profit || 0), 0)) + ' ARS');
  }
  return parts.length ? 'Contexto del negocio: ' + parts.join('. ') : '';
}

export async function askIA(msg) {
  appendMsg('user', msg);
  state.iaHistory.push({ role: 'user', content: msg });
  const typing = appendMsg('typing', '<span class="ld"></span><span class="ld"></span><span class="ld"></span>');

  const apiKey = localStorage.getItem('gx_anthropic_key') || '';
  if (!apiKey) {
    typing.remove();
    appendMsg('assistant', 'Para usar la IA, configura tu API key en Configuracion (menu lateral).');
    return;
  }

  const ctx = buildCtx();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: 'Sos un experto en Meta Ads, ecommerce y estrategia de negocio digital. Trabajes con un equipo de fashion ecommerce en Argentina. Referencias clave: ROAS breakeven 2x, margen ~49%, tipo de cambio ~$1500 ARS/USD. Respondé siempre en español rioplatense, directo y accionable. No des rodeos ni introducciones innecesarias. ' + ctx,
        messages: state.iaHistory.slice(-12)
      })
    });
    const data = await res.json();
    typing.remove();
    if (data.error) {
      appendMsg('assistant', 'Error de API: ' + data.error.message);
      return;
    }
    const reply = data.content?.[0]?.text || 'Sin respuesta.';
    state.iaHistory.push({ role: 'assistant', content: reply });
    appendMsg('assistant', reply.replace(/\n/g, '<br>'));
  } catch (e) {
    typing.remove();
    appendMsg('assistant', 'Error de conexion: ' + e.message);
  }
}

export function appendMsg(role, html) {
  const el = document.getElementById('ia-msgs');
  if (!el) return null;
  const d = document.createElement('div');
  d.className = 'msg ' + role;
  d.innerHTML = html;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
  return d;
}

export function clearIA() {
  state.iaHistory = [];
  const el = document.getElementById('ia-msgs');
  if (el) el.innerHTML = '<div class="msg assistant">Chat reiniciado. En que te puedo ayudar?</div>';
}

export function sendIA() {
  const inp = document.getElementById('ia-inp');
  if (!inp) return;
  const msg = inp.value.trim();
  if (!msg) return;
  askIA(msg);
  inp.value = '';
  inp.style.height = 'auto';
}
