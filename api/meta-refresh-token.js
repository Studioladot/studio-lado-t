// api/meta-refresh-token.js
export const config = { runtime: 'edge' };

const GRAPH = 'https://graph.facebook.com/v19.0';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

export default async function handler(req) {
  const auth = req.headers.get('authorization') || '';
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return json({ error: 'No autorizado' }, 401);

  try {
    const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const connsRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/meta_connections?expires_at=lt.${soon}&select=id,user_id,token`,
      { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    const conns = await connsRes.json();

    const results = [];
    for (const conn of conns) {
      try {
        const r = await fetch(
          `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${conn.token}`
        );
        const data = await r.json();
        if (data.error) {
          results.push({ user_id: conn.user_id, ok: false, error: data.error.message });
          continue;
        }
        const expiresAt = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString();
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/meta_connections?id=eq.${conn.id}`, {
          method: 'PATCH',
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: data.access_token, expires_at: expiresAt }),
        });
        results.push({ user_id: conn.user_id, ok: true });
      } catch (e) {
        results.push({ user_id: conn.user_id, ok: false, error: e.message });
      }
    }

    return json({ procesados: results.length, results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
