// api/ia-chat.js
// Agente de IA gratuito server-side (Groq) -- mismo contrato de respuesta que la version Gemini.
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

    if (!process.env.GROQ_API_KEY) {
      return json({ error: 'Falta GROQ_API_KEY en las variables de entorno de Vercel.' }, 500);
    }

    const { message, system } = await req.json();
    if (!message) return json({ error: 'Falta el mensaje' }, 400);

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: message });

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
      }),
    });
    const data = await r.json();
    if (data.error) return json({ error: data.error.message || 'Error de Groq' }, r.status);

    const reply = data?.choices?.[0]?.message?.content || '';
    return json({ reply });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
