// api/mp-create-plan.js
// Ejecutar UNA SOLA VEZ (manual, llamando este endpoint) para crear el plan en Mercado Pago.
// Guardar el "id" que devuelve la respuesta como MP_PLAN_ID en las env vars.
export const config = { runtime: 'edge' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Metodo no permitido' }, 405);

  try {
    const body = {
      reason: 'GOTIX - Suscripcion mensual',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 15000, // ARS, ajustar al precio real
        currency_id: 'ARS',
      },
      back_url: 'https://gotixsystem.vercel.app/?mp_subscribed=1',
    };

    const r = await fetch('https://api.mercadopago.com/preapproval_plan', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    return json(data, r.status);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
