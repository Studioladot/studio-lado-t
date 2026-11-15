import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/organization/dashboard-context'
import { incrementIaUsage } from '@/lib/ia/usage'

// Copy automático desde el video (2026-11-15). El navegador manda la voz del
// video (WAV corto) y 3 cuadros (ver new/extract-media.ts). Acá:
// 1. Se transcribe lo que se dice.
// 2. Con la transcripción, los cuadros (textos en pantalla, producto) y el
//    Perfil de negocio de la cuenta, se escriben 3 opciones de copy para Meta.
// Usa OpenAI porque la IA general de Gotix (DeepSeek) no escucha audio ni ve
// imágenes. Sin OPENAI_API_KEY la función queda apagada con un aviso claro.

export const maxDuration = 60

const OPENAI = 'https://api.openai.com/v1'
const TRANSCRIBE_MODEL = 'gpt-4o-mini-transcribe'
const COPY_MODEL = 'gpt-4o-mini'

type Body = { audio?: string | null; frames?: string[]; productUrl?: string; fileName?: string }
type Variant = { texto: string; titulo: string; descripcion: string }

async function transcribe(apiKey: string, wavBase64: string): Promise<string | null> {
  const form = new FormData()
  form.append('model', TRANSCRIBE_MODEL)
  form.append('language', 'es')
  form.append('file', new Blob([Buffer.from(wavBase64, 'base64')], { type: 'audio/wav' }), 'audio.wav')
  const res = await fetch(`${OPENAI}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form })
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: { message?: string } }
  if (!res.ok) {
    console.error('[ad-copy] transcripción falló', data.error?.message)
    return null
  }
  return data.text?.trim() || null
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'El copy automático todavía no está activado en Gotix.' }, { status: 503 })
  }

  const { activeOrganizationId } = await getDashboardContext()
  if (!activeOrganizationId) return NextResponse.json({ ok: false, error: 'No encontramos tu cuenta activa.' }, { status: 400 })

  const body = (await request.json().catch(() => ({}))) as Body
  const frames = (body.frames ?? []).filter((f) => typeof f === 'string' && f.startsWith('data:image/')).slice(0, 3)
  if (!body.audio && frames.length === 0) return NextResponse.json({ ok: false, error: 'Falta el video.' }, { status: 400 })

  const supabase = await createClient()
  const [transcripcion, { data: profile }] = await Promise.all([
    body.audio ? transcribe(apiKey, body.audio) : Promise.resolve(null),
    supabase.from('business_profile').select('brand_name, rubro, tono').eq('organization_id', activeOrganizationId).maybeSingle(),
  ])

  const marca = profile?.brand_name || 'la marca'
  const system = `Sos copywriter de anuncios de Meta (Facebook e Instagram) para ${marca}${profile?.rubro ? `, rubro ${profile.rubro}` : ''}, en Argentina.
Tono: ${profile?.tono || 'directo, cercano, vendedor sin exagerar'}. Español rioplatense (vos), natural, sin emojis.
Escribí a partir de lo que DICE el video (transcripción) y lo que SE VE (textos en pantalla, producto, oferta). No inventes precios, descuentos, cuotas, envíos ni plazos que no aparezcan en el video. Si el video muestra una oferta, usala.
Devolvé SOLO un JSON: {"variantes":[{"texto":"...","titulo":"...","descripcion":"..."}]} con 3 variantes distintas en el ángulo (por ejemplo: beneficio, urgencia/oferta, prueba social o problema-solución).
- texto (texto principal): 2 a 4 oraciones, que la primera línea enganche; puede cerrar con un llamado a comprar.
- titulo: máximo 40 caracteres.
- descripcion: máximo 30 caracteres.`

  const userContent: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: [
        transcripcion ? `Transcripción del video:\n"""${transcripcion}"""` : 'El video no tiene voz (o no se pudo transcribir): basate en lo que se ve.',
        body.productUrl ? `Link del producto: ${body.productUrl}` : '',
        body.fileName ? `Nombre del archivo (puede dar pistas del ángulo): ${body.fileName}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    },
    ...frames.map((url) => ({ type: 'image_url', image_url: { url, detail: 'low' } })),
  ]

  const res = await fetch(`${OPENAI}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: COPY_MODEL,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
    }),
  })
  const data = (await res.json().catch(() => ({}))) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
  if (!res.ok) {
    console.error('[ad-copy] generación falló', data.error?.message)
    return NextResponse.json({ ok: false, error: 'No se pudo escribir el copy. Probá de nuevo.' }, { status: 502 })
  }

  let variantes: Variant[] = []
  try {
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}') as { variantes?: Partial<Variant>[] }
    variantes = (parsed.variantes ?? [])
      .map((v) => ({ texto: String(v.texto ?? '').trim(), titulo: String(v.titulo ?? '').trim().slice(0, 40), descripcion: String(v.descripcion ?? '').trim().slice(0, 30) }))
      .filter((v) => v.texto)
      .slice(0, 3)
  } catch {
    variantes = []
  }
  if (variantes.length === 0) return NextResponse.json({ ok: false, error: 'No se pudo escribir el copy. Probá de nuevo.' }, { status: 502 })

  await incrementIaUsage(supabase, activeOrganizationId)
  return NextResponse.json({ ok: true, variantes, transcripcion })
}
