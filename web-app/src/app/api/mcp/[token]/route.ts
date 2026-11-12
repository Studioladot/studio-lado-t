import { NextResponse } from 'next/server'
import { resolveAccessToken } from '@/lib/claude-connector/tokens'
import { TOOLS, callTool, ToolError, SERVER_INSTRUCTIONS } from '@/lib/claude-connector/tools'

// Conexión de Claude a Gotix (protocolo MCP, transporte HTTP sin sesión).
// La dirección privada de cada usuario (/api/mcp/<clave>) se genera en
// Configuración > Integraciones; la clave ES la autenticación de esta ruta
// (está en PUBLIC_PATHS de src/proxy.ts — no hay cookie de sesión en los
// pedidos que hace Claude). Todo es de solo lectura: ver
// src/lib/claude-connector/tools.ts.

// Tienda Nube puede tardar en devolver muchas órdenes (paginado).
export const maxDuration = 60

const SUPPORTED_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']
const DEFAULT_VERSION = '2025-06-18'

type JsonRpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> }

function rpcResult(id: JsonRpcRequest['id'], result: unknown) {
  return { jsonrpc: '2.0', id, result }
}

function rpcError(id: JsonRpcRequest['id'], code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

async function handle(message: JsonRpcRequest, identity: NonNullable<Awaited<ReturnType<typeof resolveAccessToken>>>) {
  const { id, method, params } = message

  switch (method) {
    case 'initialize': {
      const requested = typeof params?.protocolVersion === 'string' ? params.protocolVersion : DEFAULT_VERSION
      return rpcResult(id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : DEFAULT_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'gotix', title: 'GOTIX x LADO T', version: '1.0.0' },
        instructions: SERVER_INSTRUCTIONS,
      })
    }
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, {
        tools: TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })),
      })
    case 'resources/list':
      return rpcResult(id, { resources: [] })
    case 'resources/templates/list':
      return rpcResult(id, { resourceTemplates: [] })
    case 'prompts/list':
      return rpcResult(id, { prompts: [] })
    case 'tools/call': {
      const name = typeof params?.name === 'string' ? params.name : ''
      const args = (params?.arguments ?? {}) as Record<string, unknown>
      try {
        const output = await callTool(identity, name, args)
        return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(output) }], isError: false })
      } catch (err) {
        if (err instanceof ToolError) {
          return rpcResult(id, { content: [{ type: 'text', text: err.message }], isError: true })
        }
        console.error('[api/mcp] tools/call falló', name, err)
        return rpcResult(id, {
          content: [{ type: 'text', text: 'No se pudo completar la consulta en este momento. Probá de nuevo en un rato.' }],
          isError: true,
        })
      }
    }
    default:
      return rpcError(id, -32601, `Método no soportado: ${method}`)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const identity = await resolveAccessToken(token)
  if (!identity) {
    // 404 y no 401: un 401 haría que Claude intente un login OAuth que esta
    // ruta no tiene. Para Claude una dirección inválida o revocada no existe.
    return NextResponse.json(rpcError(null, -32001, 'Dirección de Gotix no válida o revocada. Generá una nueva en Configuración > Integraciones.'), {
      status: 404,
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(rpcError(null, -32700, 'JSON inválido'), { status: 400 })
  }

  const messages = (Array.isArray(body) ? body : [body]) as JsonRpcRequest[]
  const responses = []
  for (const message of messages) {
    if (!message || typeof message !== 'object' || typeof message.method !== 'string') {
      responses.push(rpcError(null, -32600, 'Pedido inválido'))
      continue
    }
    // Notificaciones (sin id) no llevan respuesta.
    if (message.id === undefined || message.id === null) continue
    responses.push(await handle(message, identity))
  }

  if (responses.length === 0) return new Response(null, { status: 202 })
  return NextResponse.json(Array.isArray(body) ? responses : responses[0])
}

// Sin sesiones ni notificaciones del servidor: no hay canal SSE que abrir.
export function GET() {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } })
}

export function DELETE() {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } })
}
