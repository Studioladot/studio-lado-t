// Cliente de IA server-side — IA Estratégica, Diario de Marca y Desbloqueo
// Creativo (Contenido). Migrado de OpenAI a DeepSeek (2026-08-05, pedido
// explícito de la PO) — DeepSeek expone una API compatible con el formato
// de OpenAI (mismo shape de request/response en /chat/completions), así
// que este cliente no cambió de forma, solo de URL base, modelo y env var.
// Solo hay key de plataforma server-side (DEEPSEEK_API_KEY) — sin BYOK,
// mismo criterio que RESEND_API_KEY.
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export async function askAI(
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return { ok: false, error: 'Falta configurar DEEPSEEK_API_KEY en el servidor.' }

  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
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
    if (data.error) return { ok: false, error: data.error.message ?? 'Error de la API de DeepSeek.' }
    const reply = data.choices?.[0]?.message?.content
    if (!reply) return { ok: false, error: 'Sin respuesta.' }
    return { ok: true, reply }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de conexión.' }
  }
}
