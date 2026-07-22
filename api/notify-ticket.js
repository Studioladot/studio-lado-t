// api/notify-ticket.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Metodo no permitido', { status: 405 });

  // Seguridad basica: Supabase manda un header secreto que vos definis
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return new Response('No autorizado', { status: 401 });
  }

  try {
    const body = await req.json();
    const ticket = body.record; // Supabase manda el registro nuevo en "record"

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GOTIX Soporte <onboarding@resend.dev>',
        to: process.env.NOTIFY_EMAIL_TO,
        subject: `Nuevo ticket de soporte — ${ticket.user_email || 'usuario sin identificar'}`,
        html: `
          <p><strong>Usuario:</strong> ${ticket.user_email || '—'}</p>
          <p><strong>Pagina:</strong> ${ticket.pagina || '—'}</p>
          <p><strong>Descripcion:</strong> ${ticket.descripcion}</p>
          <p><strong>Ultimo error tecnico:</strong> ${ticket.ultimo_error_js || 'ninguno detectado'}</p>
          <p><strong>Fecha:</strong> ${ticket.created_at}</p>
        `,
      }),
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('notify-ticket error:', err);
    return new Response(JSON.stringify({ ok: true }), { status: 200 }); // nunca romper el webhook de Supabase
  }
}
