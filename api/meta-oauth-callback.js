// api/meta-oauth-callback.js
export const config = { runtime: 'edge' };

const GRAPH = 'https://graph.facebook.com/v19.0';

function redirectWithError(msg) {
  return Response.redirect(`https://www.gotix.com.ar/?meta_error=${encodeURIComponent(msg)}`, 302);
}

export default async function handler(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const jwt = url.searchParams.get('state');
  if (!code || !jwt) return redirectWithError('Falta code o sesion');

  try {
    const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${jwt}` },
    });
    const userData = await userRes.json();
    const userId = userData?.id;
    if (!userId) return redirectWithError('Sesion invalida');

    const redirectUri = 'https://www.gotix.com.ar/api/meta-oauth-callback';

    const shortRes = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${process.env.META_APP_SECRET}&code=${code}`
    );
    const shortData = await shortRes.json();
    if (shortData.error) return redirectWithError(shortData.error.message);

    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${shortData.access_token}`
    );
    const longData = await longRes.json();
    if (longData.error) return redirectWithError(longData.error.message);

    const longLivedToken = longData.access_token;
    const expiresInSec = longData.expires_in || 60 * 24 * 60 * 60;
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    const accRes = await fetch(`${GRAPH}/me/adaccounts?fields=id,name&access_token=${longLivedToken}&limit=200`);
    const accData = await accRes.json();
    const accounts = accData?.data || [];
    if (!accounts.length) return redirectWithError('No se encontro ninguna cuenta publicitaria');
    // Si el usuario tiene varias cuentas, preferir la cuenta conocida de Kiriz.
    // TODO: cuando haya mas clientes con varias cuentas cada uno, reemplazar esto
    // por un selector real en el frontend en vez de un ID fijo.
    const account = accounts.find(a => a.id.replace('act_', '') === '770215768688778') || accounts[0];
    const accountId = account.id.replace('act_', '');

    // Borrar conexion previa de este usuario (no hay unique constraint sobre user_id, "id" es la PK)
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/meta_connections?user_id=eq.${userId}`, {
      method: 'DELETE',
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    });

    await fetch(`${process.env.SUPABASE_URL}/rest/v1/meta_connections`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        token: longLivedToken,
        account_id: accountId,
        account_name: account.name || null,
        app_id: process.env.META_APP_ID,
        expires_at: expiresAt,
      }),
    });

    return Response.redirect('https://www.gotix.com.ar/?meta_connected=1', 302);
  } catch (err) {
    return redirectWithError(err.message);
  }
}
