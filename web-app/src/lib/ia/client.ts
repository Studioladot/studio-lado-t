// Cliente de IA server-side — IA Estratégica + Diario de Marca. Migrado de
// Claude/Anthropic a OpenAI (bloque de corrección, 2026-08-03 — decisión de
// costos de la PO): gpt-4o-mini es el modelo más chico/barato de la familia
// GPT-4o vigente, mismo criterio de "el más económico de la familia" que ya
// regía la elección anterior (Haiku 4.5). Solo hay key de plataforma
// server-side (OPENAI_API_KEY) — sin BYOK, mismo criterio que RESEND_API_KEY.
//
// OpenAI cachea automáticamente el prefijo repetido de un prompt (>1024
// tokens) del lado del servidor — a diferencia de la API de Anthropic, no
// hace falta un flag explícito tipo `cache_control: ephemeral` para
// aprovecharlo, así que no hay nada que replicar de ese mecanismo acá.
const OPENAI_MODEL = 'gpt-4o-mini'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export async function askAI(
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, error: 'Falta configurar OPENAI_API_KEY en el servidor.' }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: systemPrompt },
          // Mismo recorte que antes — últimos 12 mensajes, no la
          // conversación completa (costo/latencia).
          ...messages.slice(-12),
        ],
      }),
    })
    const data = await res.json()
    if (data.error) return { ok: false, error: data.error.message ?? 'Error de la API de OpenAI.' }
    const reply = data.choices?.[0]?.message?.content
    if (!reply) return { ok: false, error: 'Sin respuesta.' }
    return { ok: true, reply }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de conexión.' }
  }
}
