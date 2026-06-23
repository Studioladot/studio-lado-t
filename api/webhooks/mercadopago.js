// api/webhooks/mercadopago.js
// Configurar esta URL completa (https://gotixsystem.vercel.app/api/webhooks/mercadopago)
// como notification_url en el panel de Mercado Pago.
export const config = { runtime: 'edge' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

export default async function handler(req) {
  // MP siempre espera 200 rapido, incluso si despues fallamos algo interno -
  // si no, reintenta agresivamente. Por eso el try/catch envuelve todo y
  // al final respondemos 200 igual.
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || url.searchParams.get('topic');
    const dataId = url.searchParams.get('data.id') || url.searchParams.get('id');
    if (!type || !dataId) return json({ ok: true });

    // Notificacion de un pago individual (cobro recurrente ya facturado)
    if (type === 'payment') {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      });
      const payment = await r.json();
      if (payment.status === 'approved') {
        const userId = payment.external_reference; // lo seteamos nosotros al crear la suscripcion
        if (userId) await grantAccess(userId);
      }
    }

    // Notificacion de cambio de estado de la suscripcion en si
    if (type === 'subscription_preapproval' || type === 'preapproval') {
      const r = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      });
      const preapproval = await r.json();
      const userId = preapproval.external_reference;
      if (userId) {
        if (preapproval.status === 'authorized') await grantAccess(userId);
        if (preapproval.status === 'cancelled' || preapproval.status === 'paused') await revokeAccess(userId);
      }
    }

    return json({ ok: true });
  } catch (err) {
    console.error('webhook mercadopago error:', err);
    return json({ ok: true }); // 200 igual, MP no necesita saber que fallamos algo interno
  }
}

async function grantAccess(userId) {
  const expiresAt = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(); // 35 dias de margen
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
