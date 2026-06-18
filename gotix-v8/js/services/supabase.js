import state, { setState } from '../utils/state.js';
import { toast } from '../utils/helpers.js';

let dbInstance = null;
export function getDb() { return dbInstance || state.db; }
export { dbInstance as supabase };

export function initSupabase() {
  try {
    const savedUrl = localStorage.getItem('gx_sb_url') || state.SBURL;
    const savedKey = localStorage.getItem('gx_sb_key') || state.SBKEY;
    const { createClient } = supabase;
    dbInstance = createClient(savedUrl, savedKey);
    setState('db', dbInstance);
    setState('SBURL', savedUrl);
    setState('SBKEY', savedKey);
    return dbInstance;
  } catch (e) {
    return null;
  }
}

export async function signIn(email, password) {
  const res = await state.db.auth.signInWithPassword({ email, password });
  return res;
}

export async function signUp(email, password) {
  const res = await state.db.auth.signUp({ email, password });
  return res;
}

export async function signOut() {
  await state.db.auth.signOut();
  setState('me', null);
}

export async function fetchMetrics(uid, limit = 100) {
  const { data } = await state.db
    .from('metrics')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function fetchScripts(uid) {
  const { data } = await state.db
    .from('scripts')
    .select('*')
    .eq('user_id', uid)
    .order('updated_at', { ascending: false });
  return data || [];
}

export async function fetchPosts(uid) {
  const { data } = await state.db
    .from('content_posts')
    .select('*')
    .eq('user_id', uid)
    .order('date', { ascending: false });
  return data || [];
}

export async function fetchContacts(uid) {
  const { data } = await state.db
    .from('contacts')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function fetchObjectives(uid) {
  const { data } = await state.db
    .from('objectives')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function fetchGastos(uid) {
  const { data } = await state.db
    .from('expenses')
    .select('*')
    .eq('user_id', uid)
    .order('dia_vencimiento', { ascending: true });
  return data || [];
}

export async function fetchVentasDia(uid) {
  const { data } = await state.db
    .from('daily_sales')
    .select('*')
    .eq('user_id', uid)
    .order('fecha', { ascending: false });
  return data || [];
}

export async function fetchFinConfig(uid) {
  const { data } = await state.db
    .from('fin_config')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();
  return data;
}

export async function fetchTiendaNubeConnection(uid) {
  const { data } = await state.db
    .from('tiendanube_connections')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();
  return data;
}

export async function fetchUserProfile(uid) {
  try {
    const { data, error } = await state.db
      .from('user_profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (e) {
    return null;
  }
}

export async function createUserProfile(profileData) {
  await state.db.from('user_profiles').insert([profileData]);
}

export async function fetchNotas(uid) {
  const { data } = await state.db
    .from('notes')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function fetchIdeas(uid) {
  const { data } = await state.db
    .from('content_ideas')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function fetchContentCamps(uid) {
  const { data } = await state.db
    .from('content_campaigns')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function fetchContentPiezas(campId) {
  const { data } = await state.db
    .from('content_piezas')
    .select('*')
    .eq('campaign_id', campId)
    .order('fecha_planificada', { ascending: true });
  return data || [];
}

export async function fetchAllUsers() {
  const { data } = await state.db
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

// CRUD helpers
async function insertRecord(table, data) {
  const { data: res, error } = await state.db.from(table).insert([data]).select();
  if (error) throw error;
  return res?.[0] || null;
}
async function updateRecord(table, id, data) {
  const { data: res, error } = await state.db.from(table).update(data).eq('id', id).select();
  if (error) throw error;
  return res?.[0] || null;
}
async function deleteRecord(table, id) {
  const { error } = await state.db.from(table).delete().eq('id', id);
  if (error) throw error;
}

// Posts
export async function savePost(data) { return insertRecord('content_posts', data); }
export async function deletePost(id) { return deleteRecord('content_posts', id); }

// Scripts
export async function saveScript(data) { return insertRecord('scripts', data); }
export async function deleteScript(id) { return deleteRecord('scripts', id); }

// Objectives
export async function saveObjective(data) { return insertRecord('objectives', data); }
export async function deleteObjective(id) { return deleteRecord('objectives', id); }

// Ideas
export async function saveIdea(data) { return insertRecord('content_ideas', data); }
export async function deleteIdea(id) { return deleteRecord('content_ideas', id); }

// Content Campaigns
export async function saveContentCamp(data) { return insertRecord('content_campaigns', data); }
export async function deleteContentCamp(id) { return deleteRecord('content_campaigns', id); }

// Content Piezas
export async function saveContentPieza(data) { return insertRecord('content_piezas', data); }
export async function deleteContentPieza(id) { return deleteRecord('content_piezas', id); }

// Contacts
export async function saveContact(data) { return insertRecord('contacts', data); }
export async function deleteContact(id) { return deleteRecord('contacts', id); }

// Notes
export async function saveNota(data) { return insertRecord('notes', data); }
export async function deleteNota(id) { return deleteRecord('notes', id); }

export async function safeInsertMetric(rec) {
  let obj = {};
  for (const [k, v] of Object.entries(rec)) {
    if (!state._metricsBadCols.has(k)) obj[k] = v;
  }
  for (let i = 0; i < 15; i++) {
    const { data, error } = await state.db.from('metrics').insert([obj]).select();
    if (!error && data && data[0]) return data[0];
    if (!error) return null;
    const msg = error.message || '';
    const m = msg.match(/[Cc]ould not find the ["']?([a-zA-Z0-9_]+)["']? column/)
           || msg.match(/column ["']([a-zA-Z0-9_]+)["'] does not exist/);
    if (m && m[1] && m[1] !== 'user_id') {
      state._metricsBadCols.add(m[1]);
      delete obj[m[1]];
      continue;
    }
    throw new Error(msg);
  }
  throw new Error('safeInsertMetric: max reintentos');
}
