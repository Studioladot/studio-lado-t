// api/meta-status.js
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
      `${process.env.SUPABASE_URL}/rest/v1/meta_connections?user_id=eq.${userId}&select=account_id`,
      { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    const conns = await connRes.json();
    const conn = conns?.[0];
    if (!conn) return json({ connected: false });

    return json({ connected: true, account_id: String(conn.account_id).replace(/^act_/, '') });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
