// api/mp-create-subscription.js
// Devuelve el link de checkout hospedado de Mercado Pago para que el usuario
// autorice la suscripcion (carga su tarjeta EN la pagina de Mercado Pago).
// No llama a POST /preapproval -- ese endpoint es para cuando ya se tiene un
// card_token_id (tarjeta tokenizada de antemano), que no es nuestro caso.
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

    // El external_reference se pasa como query param: cuando el webhook recibe
    // la notificacion, vuelve a consultar este preapproval a la API de MP y ahi
    // SI viene el external_reference guardado (Mercado Pago lo toma de esta URL
    // al crear el preapproval desde el checkout hospedado).
    const checkoutUrl = `https://www.mercadopago.com/subscriptions/checkout?preapproval_plan_id=${process.env.MP_PLAN_ID}&external_reference=${userId}`;

    return json({ init_point: checkoutUrl });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
