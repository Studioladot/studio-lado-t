// api/ia-chat.js
// Agente de IA gratuito server-side (Google Gemini, capa gratis).
// La clave nunca toca el navegador -- a diferencia del flujo viejo con
// Anthropic, donde el usuario pegaba su propia API key en el cliente.
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
    if (!userData?.id) return json({ error: 'Sesion invalida' }, 401);

    if (!process.env.GEMINI_API_KEY) {
      return json({ error: 'Falta GEMINI_API_KEY en las variables de entorno de Vercel.' }, 500);
    }

    const { message, system } = await req.json();
    if (!message) return json({ error: 'Falta el mensaje' }, 400);

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: message }] }],
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        }),
      }
    );
    const data = await r.json();
    if (data.error) return json({ error: data.error.message || 'Error de Gemini' }, r.status);

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return json({ reply });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
