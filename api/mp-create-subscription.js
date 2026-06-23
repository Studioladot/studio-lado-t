// api/mp-create-subscription.js
// Crea la suscripcion (preapproval) de ESTE usuario contra el plan ya creado.
// Devuelve la URL ("init_point") a la que hay que redirigir al usuario para que autorice el cobro.
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
    const email = userData?.email;
    if (!userId) return json({ error: 'Sesion invalida' }, 401);

    const r = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preapproval_plan_id: process.env.MP_PLAN_ID,
        payer_email: email,
        external_reference: userId, // clave: asi el webhook sabe a que usuario de GOTIX corresponde
        back_url: 'https://gotixsystem.vercel.app/?mp_subscribed=1',
      }),
    });
    const data = await r.json();

    // Mercado Pago no siempre devuelve "error" en sus respuestas fallidas —
    // a veces solo viene "message" + "status". La validacion real es:
    // la request no fue ok, O no vino init_point (sin eso no hay nada que hacer).
    if (!r.ok || !data.init_point) {
      return json({
        error: data.message || data.error || 'Error al crear suscripcion',
        details: data,
      }, r.status !== 200 ? r.status : 400);
    }

    return json({ init_point: data.init_point, preapproval_id: data.id });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
