import { getState, setState } from '../utils/state.js';
import { fmtN, fmtDate, fmtCurrency, todayStr, esc, toast, openModal, closeModal } from '../utils/helpers.js';
import { supabase, fetchPosts, savePost, deletePost, fetchIdeas, saveIdea, deleteIdea, fetchContentCamps, saveContentCamp, deleteContentCamp, fetchContentPiezas, saveContentPieza, deleteContentPieza, fetchContacts, saveContact, deleteContact as deleteContactService } from '../services/supabase.js';

let estadoIdea = 'nueva';
let estadoPieza = 'borrador';

export async function loadContenido() {
  const state = getState();
  if (!state.me) return;
  const uid = state.me.id;
  const [pRes, iRes, ccRes, cpRes, cRes] = await Promise.all([
    fetchPosts(),
    fetchIdeas(),
    fetchContentCamps(),
    fetchContentPiezas(),
    fetchContacts(),
  ]);
  setState('posts', pRes);
  setState('ideas', iRes);
  setState('contentCamps', ccRes);
  setState('contentPiezas', cpRes);
  setState('contacts', cRes);
  renderPosts();
  renderIdeas();
  renderContentCalendar();
  renderCamps();
  renderContacts();
}
window.loadContenido = loadContenido;

export function switchContTab(tab, btn) {
  document.querySelectorAll('#page-contenido .tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#page-contenido .tab-btn').forEach(el => {
    el.style.color = 'var(--text2)';
    el.style.borderBottomColor = 'transparent';
    el.style.fontWeight = '500';
  });
  const t = document.getElementById('tab-' + tab);
  if (t) t.style.display = 'block';
  if (btn) {
    btn.style.color = 'var(--accent)';
    btn.style.borderBottomColor = 'var(--accent)';
    btn.style.fontWeight = '600';
  }
}
window.switchContTab = switchContTab;

export function renderPosts(filteredPosts) {
  const list = document.getElementById('posts-list');
  if (!list) return;
  const posts = filteredPosts || getState().posts || [];
  if (!posts.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">&#128247;</div><div class="empty-msg">Sin publicaciones</div><div class="empty-sub">Crea tu primer post</div></div>';
    return;
  }
  list.innerHTML = posts.map(p => `
    <div class="snap-card">
      <div class="snap-hdr">
        <span class="snap-name">${esc(p.titulo||'Sin titulo')}</span>
        <span class="snap-date">${fmtDate(p.fecha_publicacion)}</span>
      </div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:8px">${esc(p.contenido||'')}</div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="badge ${p.estado==='publicado'?'b-green':p.estado==='borrador'?'b-gray':'b-amber'}">${esc(p.estado||'borrador')}</span>
        ${p.imagen_url?`<img src="${esc(p.imagen_url)}" style="width:40px;height:40px;border-radius:4px;object-fit:cover"/>`:''}
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn btn-sm btn-ghost" onclick="editPost('${p.id}')">&#9998;</button>
        <button class="btn btn-sm btn-red" onclick="deletePost('${p.id}')">&#10005;</button>
      </div>
    </div>`).join('');
}
window.renderPosts = renderPosts;

export function renderIdeas() {
  const list = document.getElementById('ideas-list');
  if (!list) return;
  const ideas = getState().ideas || [];
  if (!ideas.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">&#128161;</div><div class="empty-msg">Sin ideas</div><div class="empty-sub">Agrega tu primera idea</div></div>';
    return;
  }
  list.innerHTML = ideas.map(i => `
    <div class="snap-card">
      <div class="snap-hdr">
        <span class="snap-name">${esc(i.titulo||'')}</span>
      </div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:6px">${esc(i.descripcion||'')}</div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span class="badge b-blue">${esc(i.categoria||'')}</span>
        <span class="badge ${i.estado==='realizada'?'b-green':i.estado==='en_desarrollo'?'b-amber':'b-gray'}">${esc(i.estado||'nueva')}</span>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn btn-sm btn-ghost" onclick="openAddIdea()">&#9998;</button>
        <button class="btn btn-sm btn-red" onclick="deleteIdea('${i.id}')">&#10005;</button>
      </div>
    </div>`).join('');
}
window.renderIdeas = renderIdeas;

export function renderContentCalendar() {
  const el = document.getElementById('calendar-view');
  if (!el) return;
  const hoy = new Date();
  const mes = hoy.getMonth();
  const anio = hoy.getFullYear();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const primerDia = new Date(anio, mes, 1).getDay();
  const primerLunes = primerDia === 0 ? 6 : primerDia - 1;
  const posts = getState().posts || [];
  const postsPorDia = {};
  posts.filter(p => p.fecha_publicacion).forEach(p => {
    const d = new Date(p.fecha_publicacion);
    if (d.getMonth() === mes && d.getFullYear() === anio) {
      const dia = d.getDate();
      if (!postsPorDia[dia]) postsPorDia[dia] = [];
      postsPorDia[dia].push(p);
    }
  });
  let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">';
  ['Lu','Ma','Mi','Ju','Vi','Sa','Do'].forEach(d => {
    html += `<div style="font-size:10px;font-weight:700;text-align:center;color:var(--text2);padding:4px">${d}</div>`;
  });
  for (let i = 0; i < primerLunes; i++) html += '<div></div>';
  for (let d = 1; d <= diasEnMes; d++) {
    const pd = postsPorDia[d] || [];
    const esHoy = d === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
    html += `<div style="border-radius:6px;padding:4px;min-height:48px;border:0.5px solid ${esHoy?'var(--accent)':'var(--border)'};background:${pd.length?'var(--accent-l)':'var(--surface2)'}">
      <div style="font-size:11px;font-weight:${esHoy?'800':'600'};color:${esHoy?'var(--accent)':'var(--text)'};text-align:center">${d}</div>
      ${pd.slice(0,2).map(p => `<div style="font-size:8px;padding:1px 4px;background:var(--green-l);border-radius:4px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.titulo||'')}</div>`).join('')}
      ${pd.length>2?`<div style="font-size:8px;color:var(--text2)">+${pd.length-2}</div>`:''}
    </div>`;
  }
  html += '</div>';
  el.innerHTML = html;
}
window.renderContentCalendar = renderContentCalendar;

export function renderCamps() {
  const list = document.getElementById('camp-list');
  if (!list) return;
  const camps = getState().contentCamps || [];
  if (!camps.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">&#127775;</div><div class="empty-msg">Sin campañas</div><div class="empty-sub">Crea tu primera campaña de contenido</div></div>';
    return;
  }
  list.innerHTML = camps.map(c => `
    <div class="card" style="margin-bottom:8px">
      <div class="card-title" style="margin-bottom:4px">
        <span>${esc(c.nombre||'')}</span>
        <span class="badge ${c.estado==='completado'?'b-green':c.estado==='en_produccion'?'b-amber':'b-blue'}">${esc(c.estado||'planificacion')}</span>
      </div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:8px">${esc(c.descripcion||'')}</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px">${c.fecha_inicio?fmtDate(c.fecha_inicio):''} — ${c.fecha_fin?fmtDate(c.fecha_fin):''}</div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-outline" onclick="openAddPieza('${c.id}')">+ Pieza</button>
        <button class="btn btn-sm btn-red" onclick="deleteCamp('${c.id}')">Eliminar</button>
      </div>
      <div id="piezas-${c.id}" style="margin-top:8px"></div>
    </div>`).join('');
  getState().contentPiezas.forEach(p => {
    const cont = document.getElementById('piezas-' + p.campana_id);
    if (cont) {
      cont.innerHTML += `
        <div class="snap-card" style="margin-bottom:4px">
          <div class="snap-hdr">
            <span class="snap-name">${esc(p.nombre||'')}</span>
            <span class="badge ${p.estado==='publicado'?'b-green':p.estado==='en_revision'?'b-amber':'b-gray'}">${esc(p.estado||'borrador')}</span>
          </div>
          <div style="font-size:12px;color:var(--text2)">${esc(p.tipo||'')}${p.media_url?` · <a href="${esc(p.media_url)}" target="_blank" style="color:var(--accent)">Media</a>`:''}</div>
          <div style="display:flex;gap:6px;margin-top:4px">
            <button class="btn btn-sm btn-red" onclick="deletePieza('${p.id}')">&#10005;</button>
          </div>
        </div>`;
    }
  });
}
window.renderCamps = renderCamps;

export function renderContacts() {
  const list = document.getElementById('contacts-list');
  if (!list) return;
  const contacts = getState().contacts || [];
  if (!contacts.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">&#128101;</div><div class="empty-msg">Sin contactos</div><div class="empty-sub">Agrega tu primer contacto</div></div>';
    return;
  }
  list.innerHTML = contacts.map(c => `
    <div class="crm-card">
      <div class="crm-avatar">${esc((c.nombre||'?')[0].toUpperCase())}</div>
      <div class="crm-info">
        <div class="crm-name">${esc(c.nombre||'')}</div>
        <div class="crm-brand">${esc(c.email||'')}${c.telefono?' · '+esc(c.telefono):''}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">${esc(c.nota||'')}</div>
      </div>
      <span class="badge ${c.tipo==='influencer'?'b-accent':c.tipo==='proveedor'?'b-teal':c.tipo==='cliente'?'b-green':'b-gray'}">${esc(c.tipo||'otro')}</span>
      <button class="btn btn-sm btn-red" onclick="deleteContact('${c.id}')">&#10005;</button>
    </div>`).join('');
}
window.renderContacts = renderContacts;

export function openAddPost() {
  document.getElementById('post-titulo').value = '';
  document.getElementById('post-contenido').value = '';
  document.getElementById('post-fecha').value = todayStr();
  document.getElementById('post-estado').value = 'borrador';
  document.getElementById('post-imagen').value = '';
  openModal('modal-post');
}
window.openAddPost = openAddPost;

export async function savePostFromUI() {
  const titulo = document.getElementById('post-titulo')?.value?.trim();
  if (!titulo) { toast('Ingresa el titulo'); return; }
  const data = {
    titulo,
    contenido: document.getElementById('post-contenido')?.value?.trim() || '',
    fecha_publicacion: document.getElementById('post-fecha')?.value || todayStr(),
    estado: document.getElementById('post-estado')?.value || 'borrador',
    imagen_url: document.getElementById('post-imagen')?.value?.trim() || '',
  };
  const res = await savePost(data);
  if (res) {
    const posts = getState().posts || [];
    posts.unshift(res);
    setState('posts', posts);
    renderPosts();
    closeModal('modal-post');
    toast('Post guardado');
  }
}
window.savePostFromUI = savePostFromUI;

export async function editPost(postId) {
  const posts = getState().posts || [];
  const p = posts.find(x => x.id === postId);
  if (!p) { toast('Post no encontrado'); return; }
  document.getElementById('post-titulo').value = p.titulo || '';
  document.getElementById('post-contenido').value = p.contenido || '';
  document.getElementById('post-fecha').value = p.fecha_publicacion ? p.fecha_publicacion.substring(0,10) : todayStr();
  document.getElementById('post-estado').value = p.estado || 'borrador';
  document.getElementById('post-imagen').value = p.imagen_url || '';
  openModal('modal-post');
  const saveBtn = document.querySelector('#modal-post .btn-accent');
  if (saveBtn) {
    saveBtn.textContent = 'Actualizar';
    saveBtn.onclick = async () => {
      const upd = {
        titulo: document.getElementById('post-titulo')?.value?.trim() || '',
        contenido: document.getElementById('post-contenido')?.value?.trim() || '',
        fecha_publicacion: document.getElementById('post-fecha')?.value || todayStr(),
        estado: document.getElementById('post-estado')?.value || 'borrador',
        imagen_url: document.getElementById('post-imagen')?.value?.trim() || '',
      };
      await supabase.from('content_posts').update(upd).eq('id', postId);
      const posts2 = getState().posts || [];
      const idx = posts2.findIndex(x => x.id === postId);
      if (idx >= 0) posts2[idx] = { ...posts2[idx], ...upd };
      setState('posts', posts2);
      renderPosts();
      closeModal('modal-post');
      toast('Post actualizado');
      saveBtn.textContent = 'Guardar';
      saveBtn.onclick = savePostFromUI;
    };
  }
}
window.editPost = editPost;

export async function deletePost(postId) {
  if (!confirm('¿Eliminar esta publicación?')) return;
  await deletePost(postId);
  setState('posts', (getState().posts || []).filter(p => p.id !== postId));
  renderPosts();
  toast('Post eliminado');
}
window.deletePost = deletePost;

export function openAddIdea() {
  document.getElementById('idea-titulo').value = '';
  document.getElementById('idea-desc').value = '';
  document.getElementById('idea-categoria').value = '';
  estadoIdea = 'nueva';
  openModal('modal-idea');
}
window.openAddIdea = openAddIdea;

export async function saveIdeaFromUI() {
  const titulo = document.getElementById('idea-titulo')?.value?.trim();
  if (!titulo) { toast('Ingresa el título de la idea'); return; }
  const data = {
    titulo,
    descripcion: document.getElementById('idea-desc')?.value?.trim() || '',
    categoria: document.getElementById('idea-categoria')?.value?.trim() || '',
    estado: estadoIdea,
  };
  const res = await saveIdea(data);
  if (res) {
    const ideas = getState().ideas || [];
    ideas.unshift(res);
    setState('ideas', ideas);
    renderIdeas();
    closeModal('modal-idea');
    toast('Idea guardada');
  }
}
window.saveIdeaFromUI = saveIdeaFromUI;

export async function deleteIdea(ideaId) {
  if (!confirm('¿Eliminar esta idea?')) return;
  await deleteIdea(ideaId);
  setState('ideas', (getState().ideas || []).filter(i => i.id !== ideaId));
  renderIdeas();
  toast('Idea eliminada');
}
window.deleteIdea = deleteIdea;

export function openAddCamp() {
  document.getElementById('camp-nombre').value = '';
  document.getElementById('camp-desc').value = '';
  document.getElementById('camp-fecha-inicio').value = todayStr();
  document.getElementById('camp-fecha-fin').value = '';
  document.getElementById('camp-estado').value = 'planificacion';
  openModal('modal-camp');
}
window.openAddCamp = openAddCamp;

export async function saveCampFromUI() {
  const nombre = document.getElementById('camp-nombre')?.value?.trim();
  if (!nombre) { toast('Ingresa el nombre'); return; }
  const data = {
    nombre,
    descripcion: document.getElementById('camp-desc')?.value?.trim() || '',
    fecha_inicio: document.getElementById('camp-fecha-inicio')?.value || null,
    fecha_fin: document.getElementById('camp-fecha-fin')?.value || null,
    estado: document.getElementById('camp-estado')?.value || 'planificacion',
  };
  const res = await saveContentCamp(data);
  if (res) {
    const camps = getState().contentCamps || [];
    camps.unshift(res);
    setState('contentCamps', camps);
    renderCamps();
    closeModal('modal-camp');
    toast('Campaña creada');
  }
}
window.saveCampFromUI = saveCampFromUI;

export async function deleteCamp(campId) {
  if (!confirm('¿Eliminar esta campaña?')) return;
  await deleteContentCamp(campId);
  setState('contentCamps', (getState().contentCamps || []).filter(c => c.id !== campId));
  renderCamps();
  toast('Campaña eliminada');
}
window.deleteCamp = deleteCamp;

export function openAddPieza(campId) {
  document.getElementById('pieza-camp-id').value = campId;
  document.getElementById('pieza-nombre').value = '';
  document.getElementById('pieza-contenido').value = '';
  document.getElementById('pieza-tipo').value = 'video';
  estadoPieza = 'borrador';
  document.getElementById('pieza-media').value = '';
  openModal('modal-pieza');
}
window.openAddPieza = openAddPieza;

export async function savePiezaFromUI() {
  const campId = document.getElementById('pieza-camp-id')?.value;
  const nombre = document.getElementById('pieza-nombre')?.value?.trim();
  if (!campId || !nombre) { toast('Completa los campos'); return; }
  const data = {
    campana_id: campId,
    nombre,
    contenido: document.getElementById('pieza-contenido')?.value?.trim() || '',
    tipo: document.getElementById('pieza-tipo')?.value || 'video',
    estado: estadoPieza,
    media_url: document.getElementById('pieza-media')?.value?.trim() || '',
  };
  const res = await saveContentPieza(data);
  if (res) {
    const piezas = getState().contentPiezas || [];
    piezas.push(res);
    setState('contentPiezas', piezas);
    renderCamps();
    closeModal('modal-pieza');
    toast('Pieza guardada');
  }
}
window.savePiezaFromUI = savePiezaFromUI;

export async function deletePieza(piezaId) {
  if (!confirm('¿Eliminar esta pieza?')) return;
  await deleteContentPieza(piezaId);
  setState('contentPiezas', (getState().contentPiezas || []).filter(p => p.id !== piezaId));
  renderCamps();
  toast('Pieza eliminada');
}
window.deletePieza = deletePieza;

export async function uploadMedia() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,video/*';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = `public/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('media').upload(path, file);
    if (error) { toast('Error: ' + error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
    document.getElementById('pieza-media').value = publicUrl;
    toast('Media subida');
  };
  input.click();
}
window.uploadMedia = uploadMedia;

export function openAddContact() {
  document.getElementById('contact-nombre').value = '';
  document.getElementById('contact-email').value = '';
  document.getElementById('contact-telefono').value = '';
  document.getElementById('contact-nota').value = '';
  document.getElementById('contact-tipo').value = 'otro';
  openModal('modal-contact');
}
window.openAddContact = openAddContact;

export async function saveContactFromUI() {
  const nombre = document.getElementById('contact-nombre')?.value?.trim();
  if (!nombre) { toast('Ingresa el nombre'); return; }
  const data = {
    nombre,
    email: document.getElementById('contact-email')?.value?.trim() || '',
    telefono: document.getElementById('contact-telefono')?.value?.trim() || '',
    nota: document.getElementById('contact-nota')?.value?.trim() || '',
    tipo: document.getElementById('contact-tipo')?.value || 'otro',
  };
  const res = await saveContact(data);
  if (res) {
    const contacts = getState().contacts || [];
    contacts.unshift(res);
    setState('contacts', contacts);
    renderContacts();
    closeModal('modal-contact');
    toast('Contacto guardado');
  }
}
window.saveContactFromUI = saveContactFromUI;

export async function deleteContact(contactId) {
  if (!confirm('¿Eliminar este contacto?')) return;
  await deleteContactService(contactId);
  setState('contacts', (getState().contacts || []).filter(c => c.id !== contactId));
  renderContacts();
  toast('Contacto eliminado');
}
window.deleteContact = deleteContact;

// backward compat aliases
window.filterCont2 = function (f, el) {
  document.querySelectorAll('#page-contenido .ft').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  const { posts } = getState();
  const list = document.getElementById('posts-list');
  if (!list) return;
  const filtered = f === 'all' ? posts : (posts || []).filter(p => {
    if (f === 'publicado') return p.estado === 'publicado';
    if (f === 'pendiente') return p.estado === 'borrador' || p.estado === 'pendiente';
    return (p.categoria || p.plataforma || '') === f;
  });
  renderPosts(filtered);
};
window.renderSnaps = function () {
  const el = document.getElementById('snap-list');
  if (!el) return;
  const { metrics } = getState();
  const snaps = (metrics || []).slice(0, 50);
  el.innerHTML = snaps.length ? snaps.map(s => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:0.5px solid var(--border);font-size:12px">
      <span style="flex:1">${esc(s.campaign_name||s.ad_name||'—')}</span>
      <span style="font-weight:600">$${s.inversion||0}</span>
      <span style="color:var(--${+(s.roas||0)>=4?'green':+(s.roas||0)>=2?'amber':'red'})">${s.roas?s.roas+'x':'—'}</span>
    </div>`).join('') : '<p style="text-align:center;padding:16px;color:var(--text2)">Sin snapshots</p>';
};
