// Finances module — Gastos, Ventas del día, Panel financiero
import state, { setState } from '../utils/state.js';
import { toast, setText, fmtN, currentMonthStr, todayStr } from '../utils/helpers.js';

export function calcBreakeven() {
  const totalGastos = state.gastos.reduce((a, g) => a + (+g.monto || 0), 0);
  const margen = (state.finConfig.margen_bruto || 48) / 100;
  const breakeven = margen > 0 ? totalGastos / margen : 0;
  return { totalGastos, breakeven, margen };
}

export function renderFinPanel() {
  const hoy = new Date();
  const mesActual = hoy.toISOString().substring(0, 7);
  const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const diaActual = hoy.getDate();
  const margen = (state.finConfig.margen_bruto || 48) / 100;
  const diasOp = state.finConfig.dias_operativos || 26;
  const objPct = (state.finConfig.objetivo_ganancia_pct || 20) / 100;

  const totalGastos = state.gastos.reduce((a, g) => a + (+g.monto || 0), 0);
  const ventasMes = state.ventasDia.filter(v => (v.fecha || '').startsWith(mesActual));
  const totalVentas = ventasMes.reduce((a, v) => a + (+v.monto || 0), 0);
  const ventasHoy = ventasMes.filter(v => v.fecha === hoy.toISOString().split('T')[0]).reduce((a, v) => a + (+v.monto || 0), 0);
  const breakevenMes = margen > 0 ? totalGastos / margen : 0;
  const objetivoMes = margen > 0 ? (totalGastos * (1 + objPct)) / margen : 0;
  const breakevenDia = breakevenMes / diasOp;
  const objetivoDia = objetivoMes / diasOp;
  const profitBruto = totalVentas * margen;
  const profitNeto = profitBruto - totalGastos;
  const diasRestantes = diasOp - Math.min(Math.floor((diaActual / diasEnMes) * diasOp), diasOp);

  const mesLabel = hoy.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).toUpperCase();
  setText('fin-mes-label', mesLabel);
  setText('fin-breakeven-mes', breakevenMes > 0 ? '$' + fmtN(breakevenMes) : 'Carga tus gastos');
  setText('fin-breakeven-dia-lbl', breakevenDia > 0 ? '$' + fmtN(breakevenDia) + ' por dia (minimo)' : '');
  setText('fin-objetivo-mes', objetivoMes > 0 ? '$' + fmtN(objetivoMes) : '—');
  setText('fin-objetivo-dia-lbl', objetivoDia > 0 ? '$' + fmtN(objetivoDia) + ' por dia' : '');
  setText('fin-objetivo-label', 'PARA GANAR UN ' + (state.finConfig.objetivo_ganancia_pct || 20) + '%');

  const diasPct = Math.min(100, Math.round((diaActual / diasEnMes) * 100));
  const ventasPct = breakevenMes > 0 ? Math.min(100, Math.round((totalVentas / breakevenMes) * 100)) : 0;
  setText('fin-dias-pct', `${diaActual} / ${diasEnMes} dias`);
  setText('fin-ventas-pct', `$${fmtN(totalVentas)} / $${fmtN(Math.round(breakevenMes))}`);

  const db1 = document.getElementById('fin-dias-bar');
  if (db1) db1.style.width = diasPct + '%';
  const db2 = document.getElementById('fin-ventas-bar');
  if (db2) { db2.style.width = ventasPct + '%'; db2.style.background = ventasPct >= 100 ? '#69db7c' : ventasPct >= 60 ? '#ffd43b' : '#ff6b6b'; }

  setText('fin-stat-gastos', '$' + fmtN(totalGastos));
  const ve = document.getElementById('fin-stat-ventas');
  if (ve) { ve.textContent = '$' + fmtN(totalVentas); ve.style.color = totalVentas >= breakevenMes ? 'var(--green)' : 'var(--red)'; }
  const pe = document.getElementById('fin-stat-profit');
  if (pe) { pe.textContent = (profitNeto >= 0 ? '+' : '') + '$' + fmtN(profitNeto); pe.className = 'fin-value ' + (profitNeto >= 0 ? 'green' : 'red'); }
  setText('fin-stat-dias', diasRestantes + ' dias');

  const hoyLabel = hoy.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  setText('fin-hoy-label', 'HOY — ' + hoyLabel);
  setText('fin-min-dia', breakevenDia > 0 ? '$' + fmtN(Math.round(breakevenDia)) : '—');
  setText('fin-obj-dia', objetivoDia > 0 ? '$' + fmtN(Math.round(objetivoDia)) : '—');
  setText('fin-vendido-hoy', ventasHoy > 0 ? '$' + fmtN(ventasHoy) : '$0');

  const statusEl = document.getElementById('fin-hoy-status');
  const rcEl = document.getElementById('fin-hoy-resultado-card');
  if (statusEl && rcEl) {
    if (breakevenDia === 0) {
      statusEl.textContent = 'Configura tus gastos para ver tu meta diaria';
      statusEl.style.background = 'var(--surface2)'; statusEl.style.color = 'var(--text2)';
    } else if (ventasHoy >= objetivoDia) {
      const extra = ventasHoy - objetivoDia;
      statusEl.innerHTML = '✅ Estas $' + fmtN(Math.round(extra)) + ' arriba del objetivo. Excelente dia!';
      statusEl.style.background = 'var(--green-l)'; statusEl.style.color = 'var(--green)';
      rcEl.style.background = 'var(--green-l)'; rcEl.style.borderColor = 'var(--green)';
      document.getElementById('fin-vendido-hoy').style.color = 'var(--green)';
    } else if (ventasHoy >= breakevenDia) {
      statusEl.innerHTML = '🟡 No perdiste. Faltan $' + fmtN(Math.round(objetivoDia - ventasHoy)) + ' para el objetivo.';
      statusEl.style.background = 'var(--amber-l)'; statusEl.style.color = 'var(--amber)';
      rcEl.style.background = 'var(--amber-l)'; rcEl.style.borderColor = 'var(--amber)';
      document.getElementById('fin-vendido-hoy').style.color = 'var(--amber)';
    } else {
      const faltan = breakevenDia - ventasHoy;
      statusEl.innerHTML = '🔴 Estas perdiendo. Faltan $' + fmtN(Math.round(faltan)) + ' para no perder.';
      statusEl.style.background = 'var(--red-l)'; statusEl.style.color = 'var(--red)';
      rcEl.style.background = 'var(--red-l)'; rcEl.style.borderColor = 'var(--red)';
      document.getElementById('fin-vendido-hoy').style.color = 'var(--red)';
    }
  }

  // Vencimientos próximos
  const hoyDia = hoy.getDate();
  const venc = state.gastos
    .filter(g => g.dia_vencimiento && g.dia_vencimiento >= hoyDia && g.dia_vencimiento <= hoyDia + 10)
    .sort((a, b) => a.dia_vencimiento - b.dia_vencimiento);
  const vEl = document.getElementById('fin-vencimientos');
  if (vEl) {
    if (!venc.length) {
      vEl.innerHTML = '<div style="color:var(--text2);font-size:13px;padding:8px 0">Sin vencimientos en los proximos 10 dias</div>';
    } else {
      vEl.innerHTML = venc.map(g => {
        const diasFaltan = g.dia_vencimiento - hoyDia;
        const urgente = diasFaltan <= 3;
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:0.5px solid var(--border)">
          <div style="flex:1"><div style="font-size:13px;font-weight:600">${g.nombre}</div><div style="font-size:11px;color:var(--text2)">${g.categoria}</div></div>
          <div style="text-align:right">
            <div style="font-size:14px;font-weight:700;color:${urgente ? 'var(--red)' : 'var(--text)'}">${'$' + fmtN(g.monto)}</div>
            <div style="font-size:11px;color:${urgente ? 'var(--red)' : 'var(--text2)'}">${diasFaltan === 0 ? 'Vence HOY' : 'Vence en ' + diasFaltan + ' dias'}</div>
          </div>
        </div>`;
      }).join('');
    }
  }
}

export function renderGastos() {
  const list = state.gastosFilter === 'all' ? state.gastos : state.gastos.filter(g => g.tipo === state.gastosFilter);
  const tbl = document.getElementById('gastos-tbl');
  const catColors = { operativo: 'b-blue', marketing: 'b-accent', proveedor: 'b-teal', personal: 'b-green', impuesto: 'b-amber', deuda: 'b-red', otro: 'b-gray' };
  if (!list.length) { tbl.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text2);padding:24px">Sin gastos</td></tr>'; }
  else {
    tbl.innerHTML = list.map(g => `<tr>
      <td style="font-weight:600">${g.nombre}<br><span style="font-size:11px;color:var(--text2)">${g.notas || ''}</span></td>
      <td><span class="badge ${catColors[g.categoria] || 'b-gray'}">${g.categoria}</span></td>
      <td><span class="badge b-gray">${g.tipo}</span></td>
      <td style="font-weight:700">$${fmtN(g.monto)}</td>
      <td style="font-size:13px;color:var(--text2)">${g.dia_vencimiento ? 'Dia ' + g.dia_vencimiento : '—'}</td>
      <td><span class="badge ${g.pagado ? 'b-green' : 'b-amber'}">${g.pagado ? '✓ Pagado' : 'Pendiente'}</span></td>
      <td><button class="btn btn-sm btn-red" onclick="delGasto('${g.id}')">✕</button></td>
    </tr>`).join('');
  }
  const total = state.gastos.reduce((a, g) => a + (+g.monto || 0), 0);
  const pendiente = state.gastos.filter(g => !g.pagado).reduce((a, g) => a + (+g.monto || 0), 0);
  setText('gastos-total', '$' + fmtN(total));
  setText('gastos-pendiente', '$' + fmtN(pendiente));
}

export function renderVentasDia() {
  const mesFilter = document.getElementById('ventas-mes-filter')?.value || currentMonthStr();
  const list = state.ventasDia.filter(v => (v.fecha || '').startsWith(mesFilter));
  const tbl = document.getElementById('ventas-dia-tbl');
  if (!list.length) { tbl.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text2);padding:24px">Sin ventas registradas</td></tr>'; }
  else {
    const totalGastos = state.gastos.reduce((a, g) => a + (+g.monto || 0), 0);
    const margen = (state.finConfig.margen_bruto || 48) / 100;
    const diasOp = state.finConfig.dias_operativos || 26;
    const breakevenDia = margen > 0 ? (totalGastos / margen) / diasOp : 0;
    const objPct = (state.finConfig.objetivo_ganancia_pct || 20) / 100;
    const objetivoDia = margen > 0 ? ((totalGastos * (1 + objPct)) / margen) / diasOp : 0;

    tbl.innerHTML = list.map(v => {
      const vsMin = breakevenDia > 0 ? ((+v.monto || 0) / breakevenDia * 100 - 100).toFixed(0) : '—';
      const vsObj = objetivoDia > 0 ? ((+v.monto || 0) / objetivoDia * 100 - 100).toFixed(0) : '—';
      const vsMinColor = +vsMin >= 0 ? 'var(--green)' : 'var(--red)';
      const vsObjColor = +vsObj >= 0 ? 'var(--green)' : 'var(--red)';
      return `<tr>
        <td style="font-weight:600">${v.fecha || '—'}</td>
        <td style="font-weight:700">$${fmtN(v.monto)}</td>
        <td>${v.unidades || '—'}</td>
        <td><span class="badge b-gray">${v.canal || '—'}</span></td>
        <td style="color:${vsMinColor};font-weight:600">${vsMin !== '—' ? vsMin + '%' : '—'}</td>
        <td style="color:${vsObjColor};font-weight:600">${vsObj !== '—' ? vsObj + '%' : '—'}</td>
        <td style="font-size:12px;color:var(--text2)">${v.notas || ''}</td>
        <td><button class="btn btn-sm btn-red" onclick="delVentaDia('${v.id}')">✕</button></td>
      </tr>`;
    }).join('');
  }
  const total = list.reduce((a, v) => a + (+v.monto || 0), 0);
  setText('ventas-dia-total', '$' + fmtN(total));
}

export async function saveGasto() {
  const nombre = document.getElementById('g-nombre').value.trim();
  if (!nombre) { toast('Ingresa el concepto del gasto'); return; }
  const rec = {
    user_id: state.me.id, nombre,
    monto: +document.getElementById('g-monto').value || 0,
    categoria: document.getElementById('g-cat').value,
    tipo: document.getElementById('g-tipo').value,
    dia_vencimiento: +document.getElementById('g-dia').value || null,
    notas: document.getElementById('g-notas').value.trim()
  };
  const { data, error } = await state.db.from('expenses').insert([rec]).select();
  if (error) { toast('Error: ' + error.message); return; }
  state.gastos.unshift(data[0]);
  renderGastos();
  renderFinPanel();
  ['g-nombre', 'g-monto', 'g-dia', 'g-notas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  toast('Gasto guardado ✓');
}

export function filterGastos(f, el) {
  state.gastosFilter = f;
  document.querySelectorAll('#fin-tab-gastos .ft').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderGastos();
}

export async function delGasto(id) {
  await state.db.from('expenses').delete().eq('id', id);
  state.gastos = state.gastos.filter(g => g.id !== id);
  renderGastos();
  renderFinPanel();
  toast('Gasto eliminado');
}

export async function togglePagado(id) {
  const g = state.gastos.find(x => x.id === id);
  if (!g) return;
  const newVal = !g.pagado;
  await state.db.from('expenses').update({ pagado: newVal }).eq('id', id);
  g.pagado = newVal;
  renderGastos();
}

export async function saveVentaDia() {
  const monto = +document.getElementById('v-monto').value || 0;
  if (!monto) { toast('Ingresa el monto de la venta'); return; }
  const rec = {
    user_id: state.me.id,
    fecha: document.getElementById('v-fecha').value || todayStr(),
    monto,
    unidades: +document.getElementById('v-unidades').value || 0,
    canal: document.getElementById('v-canal').value,
    notas: document.getElementById('v-notas').value.trim()
  };
  const { data, error } = await state.db.from('daily_sales').insert([rec]).select();
  if (error) { toast('Error: ' + error.message); return; }
  state.ventasDia.unshift(data[0]);
  renderVentasDia();
  renderFinPanel();
  document.getElementById('v-monto').value = '';
  document.getElementById('v-notas').value = '';
  toast('Venta registrada ✓');
}

export async function delVentaDia(id) {
  await state.db.from('daily_sales').delete().eq('id', id);
  state.ventasDia = state.ventasDia.filter(v => v.id !== id);
  renderVentasDia();
  renderFinPanel();
  toast('Venta eliminada');
}

export async function saveFinConfig() {
  const rec = {
    user_id: state.me.id,
    margen_bruto: +document.getElementById('fc-margen').value || 48,
    dias_operativos: +document.getElementById('fc-dias').value || 26,
    objetivo_ganancia_pct: +document.getElementById('fc-objetivo').value || 20,
  };
  const { error } = await state.db.from('fin_config').upsert([rec], { onConflict: 'user_id' }).select();
  if (error) { toast('Error: ' + error.message); return; }
  Object.assign(state.finConfig, rec);
  renderFinPanel();
  toast('Config guardada ✓');
}
