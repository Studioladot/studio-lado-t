// api/meta-oauth-callback.js
// Redirect URI configurada en Meta Developers. Recibe ?code=...&state=<jwt_supabase>
export const config = { runtime: 'edge' };

const GRAPH = 'https://graph.facebook.com/v19.0';

function redirectWithError(msg) {
  return Response.redirect(`https://gotixsystem.vercel.app/?meta_error=${encodeURIComponent(msg)}`, 302);
}

export default async function handler(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const jwt = url.searchParams.get('state'); // el JWT de Supabase viaja en "state"
  if (!code || !jwt) return redirectWithError('Falta code o sesion');

  try {
    // 1. Verificar el JWT y obtener el user_id (mismo patron que el resto de los endpoints)
    const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${jwt}` },
    });
    const userData = await userRes.json();
    const userId = userData?.id;
    if (!userId) return redirectWithError('Sesion invalida');

    const redirectUri = 'https://gotixsystem.vercel.app/api/meta-oauth-callback';

    // 2. Code -> token de corta duracion
    const shortRes = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${process.env.META_APP_SECRET}&code=${code}`
    );
    const shortData = await shortRes.json();
    if (shortData.error) return redirectWithError(shortData.error.message);

    // 3. Token corto -> token largo (60 dias)
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${shortData.access_token}`
    );
    const longData = await longRes.json();
    if (longData.error) return redirectWithError(longData.error.message);

    const longLivedToken = longData.access_token;
    const expiresInSec = longData.expires_in || 60 * 24 * 60 * 60; // fallback 60 dias
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    // 4. Detectar la(s) cuenta(s) publicitaria(s) del usuario y tomar la primera
    //    (si el cliente maneja varias cuentas, esto se puede convertir en un selector despues)
    const accRes = await fetch(`${GRAPH}/me/adaccounts?fields=id,name&access_token=${longLivedToken}`);
    const accData = await accRes.json();
    const account = accData?.data?.[0];
    if (!account) return redirectWithError('No se encontro ninguna cuenta publicitaria');
    const accountId = account.id.replace('act_', '');

    // 5. Guardar (mismo upsert que ya usa /api/meta-save)
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/meta_connections?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: userId,
        access_token: longLivedToken,
        account_id: accountId,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }),
    });

    return Response.redirect('https://gotixsystem.vercel.app/?meta_connected=1', 302);
  } catch (err) {
    return redirectWithError(err.message);
  }
}
