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
      `${process.env.SUPABASE_URL}/rest/v1/meta_connections?user_id=eq.${userId}&select=access_token,account_id`,
      { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    const conns = await connRes.json();
    const conn = conns?.[0];
    if (!conn) return json({ error: 'Meta Ads no conectado' }, 404);

    const url = new URL(req.url);
    const path = url.searchParams.get('path'); // ej: "act_123/campaigns"
    if (!path) return json({ error: 'Falta path' }, 400);

    // Forzar que el path solo pueda referirse a LA CUENTA QUE ESTE USUARIO CONECTO,
    // nunca a otra cuenta de Meta (aunque su token tenga acceso a otras).
    const cleanAccountId = String(conn.account_id).replace('act_', '');
    const isOwnAccountPath = path === `act_${cleanAccountId}` || path.startsWith(`act_${cleanAccountId}/`);
    if (!isOwnAccountPath) return json({ error: 'Path no autorizado' }, 403);

    const graphParams = new URLSearchParams(url.searchParams);
    graphParams.delete('path');
    graphParams.set('access_token', conn.access_token);

    const graphRes = await fetch(`https://graph.facebook.com/v19.0/${path}?${graphParams}`);
    const data = await graphRes.json();
    return json(data, graphRes.status);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
