// Global application state
const state = {
  // Auth
  db: null,
  me: null,
  isAdmin: false,
  userProfile: null,

  // Supabase config
  SBURL: 'https://vluoynizpvckjqomojxx.supabase.co',
  SBKEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdW95bml6cHZja2pxb21vanh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzE4MTQsImV4cCI6MjA5NjYwNzgxNH0.ItNRCYNzKYvs_S_ToOSOwKesRGZvniq0-kFNKcqZFPM',

  // API keys
  APIKEY: localStorage.getItem('gx_anthropic_key') || '',

  // Meta Ads
  META_TOKEN: localStorage.getItem('gx_meta_token') || '',
  META_ACCOUNT: localStorage.getItem('lt_meta_account') || '',
  metaCampaigns: [],
  metaAdsets: [],
  metaAds: [],
  metaCampFilter: 'ALL',
  currentCampaignId: null,
  currentAdsetId: null,
  rankingLevel: 'campaign',

  // Data arrays
  metrics: [],
  scripts: [],
  objectives: [],
  finances: [],
  posts: [],
  contacts: [],
  gastos: [],
  ventasDia: [],
  notas: [],
  ideas: [],
  contentCamps: [],
  contentPiezas: [],
  currentCampId: null,
  anCostosAdicionales: [],
  anProductos: [],
  anLineItems: [],
  anChannelRows: [],
  anSelectedProducts: new Set(),
  bibAdsData: [],

  // Filters and UI state
  selScript: null,
  bibF: 'all',
  contF: 'all',
  crmF: 'all',
  contFilter2: 'all',
  iaHistory: [],
  authMode: 'login',
  gastosFilter: 'all',
  finActiveTab: 'panel',
  ventasView: 'lista',
  notaColorSel: '#fef3d8',

  // Benchmarks
  benchmarks: {},

  // Fin config
  finConfig: { margen_bruto: 48, dias_operativos: 26, objetivo_ganancia_pct: 20 },

  // Tienda Nube
  tnConnection: null,
  tnSalesSummary: { bruto: 0, envio: 0, neto: 0, ordenes: 0 },
  tnFunnelData: { atc: 0, ic: 0, purch: 0, gastoMeta: 0, roasMeta: 0, roasReal: 0, ventasTN: 0 },

  // Constants
  ANGLES: ['Necesidad Emocional', 'Prueba Social', 'Modelado', 'Urgencia/Escasez', 'Promocion', 'Valor/Precio', 'Problema/Solucion', 'FAQ', 'Detras de escena', 'Otro'],
  STS: ['borrador', 'test', 'activo', 'ganador', 'pausado'],
  STS_LBL: { borrador: 'Borrador', test: 'En test', activo: 'Activo', ganador: 'Ganador', pausado: 'Pausado' },
  STS_BADGE: { borrador: 'b-gray', test: 'b-blue', activo: 'b-teal', ganador: 'b-green', pausado: 'b-amber' },
  PZ_CYCLE: ['pendiente', 'en_produccion', 'filmado', 'editado', 'publicado'],
  PZ_ICON: { pendiente: '◌', en_produccion: '▶', filmado: '◉', editado: '◐', publicado: '✓' },
  PZ_COLOR: { pendiente: 'var(--text3)', en_produccion: 'var(--blue)', filmado: 'var(--amber)', editado: 'var(--accent)', publicado: 'var(--green)' },
  PZ_LABEL: { pendiente: 'Pendiente', en_produccion: 'En produccion', filmado: 'Filmado', editado: 'Editado', publicado: 'Publicado' },
  ALL_SECTIONS: ['dashboard', 'meta', 'finanzas', 'contenido', 'notas', 'ia'],
  GRAPH: 'https://graph.facebook.com/v19.0',
  AD_FIELDS: 'spend,actions,action_values,impressions,clicks,ctr,cpm,cpc,frequency,video_thruplay_watched_actions,video_p25_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_play_actions',
  CAMP_FIELDS: 'id,name,status,effective_status,daily_budget,lifetime_budget,objective',
  ADSET_FIELDS: 'id,name,status,effective_status,daily_budget,targeting',
  AD_INFO_FIELDS: 'id,name,status,effective_status,creative{id,name,thumbnail_url}',
  _metricsBadCols: new Set(),
  scTimers: {},
};

// Simple reactive state
const listeners = {};

export function getState() {
  return state;
}

export function setState(key, value) {
  state[key] = value;
  if (listeners[key]) {
    listeners[key].forEach(fn => fn(value));
  }
}

export function onStateChange(key, fn) {
  if (!listeners[key]) listeners[key] = [];
  listeners[key].push(fn);
}

export default state;
