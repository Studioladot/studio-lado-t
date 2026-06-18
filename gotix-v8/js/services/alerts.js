// Centro de Alertas — Sistema de notificaciones inteligentes
import state from '../utils/state.js';

let alerts = [];
let listeners = [];

export function getAlerts() {
  return alerts;
}

export function onAlertsChange(fn) {
  listeners.push(fn);
}

function notify() {
  listeners.forEach(fn => fn(alerts));
  const badge = document.getElementById('alert-badge');
  const critical = alerts.filter(a => a.severity === 'critico').length;
  if (badge) {
    badge.textContent = critical > 0 ? critical : alerts.length > 0 ? alerts.length : '';
    badge.style.display = alerts.length > 0 ? 'flex' : 'none';
  }
}

function addAlert(alert) {
  alerts.unshift(alert);
  notify();
}

export function clearAlerts() {
  alerts = [];
  notify();
}

export function dismissAlert(id) {
  alerts = alerts.filter(a => a.id !== id);
  notify();
}

// Generate alerts from current business data
export function scanAlerts() {
  const newAlerts = [];
  let id = Date.now();

  // 1. Meta Ads alerts
  for (const c of state.metaCampaigns) {
    const ins = c.insights || {};
    if (ins.frequency && +ins.frequency > 4) {
      newAlerts.push({
        id: id++,
        type: 'meta',
        severity: 'critico',
        title: 'Frecuencia muy alta',
        message: `"${c.name}" tiene frecuencia de ${ins.frequency}. Saturación de audiencia — pausar o cambiar creativos.`,
        campaign: c.name,
        timestamp: new Date().toISOString()
      });
    }
    if (ins.roas && +ins.roas < 1.5) {
      newAlerts.push({
        id: id++,
        type: 'meta',
        severity: 'critico',
        title: 'ROAS por debajo del breakeven',
        message: `"${c.name}" tiene ROAS de ${ins.roas}x. Estás perdiendo plata.`,
        campaign: c.name,
        timestamp: new Date().toISOString()
      });
    }
    if (ins.ctr && +ins.ctr < 1) {
      newAlerts.push({
        id: id++,
        type: 'meta',
        severity: 'importante',
        title: 'CTR bajo',
        message: `"${c.name}" tiene CTR de ${ins.ctr}%. El hook no convence o la segmentación es incorrecta.`,
        campaign: c.name,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 2. Financial alerts
  const totalGastos = state.gastos.reduce((a, g) => a + (+g.monto || 0), 0);
  const hoy = new Date();
  const mesActual = hoy.toISOString().substring(0, 7);
  const ventasMes = state.ventasDia.filter(v => (v.fecha || '').startsWith(mesActual));
  const totalVentas = ventasMes.reduce((a, v) => a + (+v.monto || 0), 0);
  const margen = (state.finConfig.margen_bruto || 48) / 100;
  const breakeven = margen > 0 ? totalGastos / margen : 0;
  const profitBruto = totalVentas * margen;
  const profitNeto = profitBruto - totalGastos;

  if (totalGastos > 0 && totalVentas === 0) {
    newAlerts.push({
      id: id++,
      type: 'finanza',
      severity: 'importante',
      title: 'Sin ventas en el mes',
      message: `Llevás ${totalGastos > 0 ? '$' + Math.round(totalGastos).toLocaleString('es-AR') : ''} en gastos y $0 en ventas. Revisá tu estrategia.`,
      timestamp: new Date().toISOString()
    });
  }
  if (profitNeto < 0 && totalGastos > 0) {
    newAlerts.push({
      id: id++,
      type: 'finanza',
      severity: 'critico',
      title: 'Estás perdiendo plata este mes',
      message: `Profit negativo: -$${Math.round(Math.abs(profitNeto)).toLocaleString('es-AR')}. Revisá gastos o aumentá ventas.`,
      timestamp: new Date().toISOString()
    });
  }

  // 3. Content alerts
  const thisWeek = state.posts.filter(p => {
    const d = p.date ? new Date(p.date) : null;
    if (!d) return false;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo && d <= now;
  });
  if (thisWeek.length === 0 && state.posts.length > 0) {
    newAlerts.push({
      id: id++,
      type: 'contenido',
      severity: 'informativo',
      title: 'Sin publicaciones esta semana',
      message: 'No publicaste contenido en los últimos 7 días. Mantené la consistencia.',
      timestamp: new Date().toISOString()
    });
  }

  // 4. Scripts/creativos alerts
  const activos = state.scripts.filter(s => s.status === 'activo' || s.status === 'ganador');
  if (activos.length === 0 && state.scripts.length > 0) {
    newAlerts.push({
      id: id++,
      type: 'creativo',
      severity: 'importante',
      title: 'Sin guiones activos',
      message: 'Tenés guiones guardados pero ninguno activo o ganador. Revisá tus creativos.',
      timestamp: new Date().toISOString()
    });
  }

  // 5. Upcoming payments
  const hoyDia = hoy.getDate();
  const vencimientos = state.gastos.filter(g => {
    if (!g.dia_vencimiento) return false;
    const diff = g.dia_vencimiento - hoyDia;
    return diff >= 0 && diff <= 3;
  });
  for (const g of vencimientos) {
    const diff = g.dia_vencimiento - hoyDia;
    newAlerts.push({
      id: id++,
      type: 'vencimiento',
      severity: diff === 0 ? 'critico' : 'importante',
      title: `Vence ${g.nombre}`,
      message: diff === 0
        ? `"${g.nombre}" vence HOY — $${Math.round(g.monto).toLocaleString('es-AR')}`
        : `"${g.nombre}" vence en ${diff} días — $${Math.round(g.monto).toLocaleString('es-AR')}`,
      timestamp: new Date().toISOString()
    });
  }

  alerts = newAlerts;
  notify();
  return alerts;
}

// Auto-scan every 5 minutes
export function startAutoScan() {
  scanAlerts();
  setInterval(scanAlerts, 5 * 60 * 1000);
}
