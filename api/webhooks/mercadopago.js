// api/webhooks/mercadopago.js
export const config = { runtime: 'edge' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || url.searchParams.get('topic');
    const dataId = url.searchParams.get('data.id') || url.searchParams.get('id');
    if (!type || !dataId) return json({ ok: true });

    if (type === 'payment') {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      });
      const payment = await r.json();
      if (payment.status === 'approved') {
        const userId = payment.external_reference || await findUserIdByEmail(payment.payer?.email);
        if (userId) await grantAccess(userId);
      }
    }

    if (type === 'subscription_preapproval' || type === 'preapproval') {
      const r = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      });
      const preapproval = await r.json();
      const userId = preapproval.external_reference || await findUserIdByEmail(preapproval.payer_email);
      if (userId) {
        if (preapproval.status === 'authorized') await grantAccess(userId);
        if (preapproval.status === 'cancelled' || preapproval.status === 'paused') await revokeAccess(userId);
      }
    }

    return json({ ok: true });
  } catch (err) {
    console.error('webhook mercadopago error:', err);
    return json({ ok: true });
  }
}

// Red de seguridad: si el external_reference no llego (puede pasar con el
// checkout hospedado), buscamos al usuario de Supabase por el email con el
// que pago en Mercado Pago.
async function findUserIdByEmail(email) {
  if (!email) return null;
  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    const data = await r.json();
    return data?.users?.[0]?.id || null;
  } catch {
    return null;
  }
}

async function grantAccess(userId) {
  const expiresAt = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString();
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ is_approved: true, expires_at: expiresAt }),
  });
}

async function revokeAccess(userId) {
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ is_approved: false }),
  });
}
