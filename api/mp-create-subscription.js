// api/mp-create-subscription.js
// Devuelve el init_point REAL del plan, consultandolo directo a Mercado Pago
// (en vez de armar la URL del checkout a mano).
export const config = { runtime: 'edge' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Metodo no permitido' }, 405);
  const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!jwt) return json({ error: 'Falta autenticacion' }, 401);

  try {
    const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${jwt}` },
    });
    const userData = await userRes.json();
    const userId = userData?.id;
    if (!userId) return json({ error: 'Sesion invalida' }, 401);

    if (!process.env.MP_PLAN_ID) {
      return json({ error: 'Falta la variable de entorno MP_PLAN_ID en Vercel.' }, 500);
    }

    const planRes = await fetch(`https://api.mercadopago.com/preapproval_plan/${process.env.MP_PLAN_ID}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const plan = await planRes.json();

    if (!planRes.ok || !plan.init_point) {
      return json({ error: plan.message || 'No se pudo obtener el link de pago del plan.', details: plan }, planRes.status !== 200 ? planRes.status : 400);
    }

    // Le agregamos external_reference por si Mercado Pago lo respeta en este link
    // (si no lo respeta, el webhook tiene un fallback por email igual).
    const checkoutUrl = `${plan.init_point}${plan.init_point.includes('?') ? '&' : '?'}external_reference=${userId}`;

    return json({ init_point: checkoutUrl });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
