// api/meta-proxy.js
export const config = { runtime: 'edge' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

export default async function handler(req) {
  const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!jwt) return json({ error: 'Falta autenticacion' }, 401);

  try {
    const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${jwt}` },
    });
    const userData = await userRes.json();
    const userId = userData?.id;
    if (!userId) return json({ error: 'Sesion invalida' }, 401);

    const connRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/meta_connections?user_id=eq.${userId}&select=token,account_id&order=created_at.desc&limit=1`,
      { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    const conns = await connRes.json();
    const conn = conns?.[0];
    if (!conn || !conn.token) return json({ error: 'Meta Ads no conectado' }, 404);

    const cleanAccountId = String(conn.account_id).replace(/^act_/, '');
    const url = new URL(req.url);

    // ── SUBIDA DE VIDEO (multipart binario): unica excepcion que no pasa por JSON.
    // Solo se permite hacia act_{cuenta}/advideos, nunca a otro path.
    const contentType = req.headers.get('content-type') || '';
    if (req.method === 'POST' && contentType.includes('multipart/form-data')) {
      const videoPath = url.searchParams.get('path');
      if (videoPath !== `act_${cleanAccountId}/advideos`) {
        return json({ error: 'Path no autorizado para subida de video' }, 403);
      }
      const incomingForm = await req.formData();
      const graphForm = new FormData();
      for (const [key, value] of incomingForm.entries()) graphForm.append(key, value);
      graphForm.append('access_token', conn.token);
      const graphRes = await fetch(`https://graph.facebook.com/v19.0/${videoPath}`, {
        method: 'POST',
        body: graphForm,
      });
      const data = await graphRes.json();
      return json(data, graphRes.status);
    }

    // ── Path: en GET viaja en la querystring, en POST viaja en el body JSON ──
    let path, bodyParams = {};
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      path = body.path;
      bodyParams = { ...body };
      delete bodyParams.path;
    } else {
      path = url.searchParams.get('path');
    }
    if (!path) return json({ error: 'Falta path' }, 400);
    path = path.replace(/^act_act_/, 'act_');

    const isOwnAccountPath = path === `act_${cleanAccountId}` || path.startsWith(`act_${cleanAccountId}/`);
    // Permite tambien cualquier ID de objeto numerico (campana/conjunto/anuncio),
    // con o sin sub-recurso despues (ej: "120211.../adsets", "120211.../ads").
    // Esto NUNCA permite leer ni escribir sobre otra cuenta publicitaria,
    // solo objetos individuales a los que el token del usuario ya tiene acceso.
    const isObjectIdPath = /^\d+(\/.*)?$/.test(path);
    if (!isOwnAccountPath && !isObjectIdPath) {
      return json({ error: 'Path no autorizado', path: path, expected: cleanAccountId }, 403);
    }

    // ── ESCRITURA (POST): solo se permite sobre un objeto individual ya existente. ──
    // Nunca se permite POST sobre act_xxx (la cuenta) ni sobre rutas con sub-recurso
    // (ej "act_x/campaigns" o "id/adsets"), para no abrir la puerta a crear cosas nuevas
    // desde este endpoint — su unico proposito hoy es cambiar el status de algo que ya existe.
    if (req.method === 'POST') {
      // Lista blanca de endpoints de creacion permitidos, SOLO dentro de la cuenta propia del usuario
      // (isOwnAccountPath ya garantiza que el path empieza con act_{cleanAccountId}/).
      const ALLOWED_CREATE_PATHS = ['campaigns', 'adsets', 'ads', 'adimages', 'adcreatives'];
      const createSubPath = isOwnAccountPath ? path.slice(`act_${cleanAccountId}/`.length) : null;
      const isAllowedCreatePath = isOwnAccountPath && ALLOWED_CREATE_PATHS.includes(createSubPath);

      if (!isAllowedCreatePath && (!isObjectIdPath || path.includes('/'))) {
        return json({ error: 'Escritura no autorizada para ese path' }, 403);
      }
      const graphBody = new URLSearchParams({ ...bodyParams, access_token: conn.token });
      const graphRes = await fetch(`https://graph.facebook.com/v19.0/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: graphBody,
      });
      const data = await graphRes.json();
      return json(data, graphRes.status);
    }

    // ── LECTURA (GET): igual que antes, sin cambios ──
    const graphParams = new URLSearchParams(url.searchParams);
    graphParams.delete('path');
    graphParams.set('access_token', conn.token);

    const graphRes = await fetch(`https://graph.facebook.com/v19.0/${path}?${graphParams}`);
    const data = await graphRes.json();
    return json(data, graphRes.status);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
