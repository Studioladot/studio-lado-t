import { META_GRAPH_URL } from './oauth'

export type GraphErrorBody = {
  error?: { message?: string; error_user_title?: string; error_user_msg?: string; error_subcode?: number }
}

/**
 * Meta manda dos mensajes: `message` es técnico y genérico ("Invalid
 * parameter"); `error_user_msg` es el texto pensado para el usuario final,
 * en su idioma. Se muestra ese cuando existe y el técnico queda en el log.
 */
function readableGraphError(error: NonNullable<GraphErrorBody['error']>, fallback: string): string {
  if (error.error_user_msg || error.error_user_title) {
    console.error('[meta] graph error', error.message, error.error_subcode)
    return error.error_user_msg ?? error.error_user_title ?? fallback
  }
  return error.message ?? fallback
}
export type MetaMutationResult = { ok: true } | { ok: false; error: string }
export type MetaCreateResult = { ok: true; id: string } | { ok: false; error: string }

export async function metaGraphGet<T>(
  path: string,
  token: string
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const separator = path.includes('?') ? '&' : '?'
    // Auditoría de performance (2026-08-01): antes cada lectura le pegaba a
    // la Graph API sin ningún caché — dos componentes de la misma página, o
    // una navegación de ida y vuelta en segundos, disparaban la misma
    // consulta dos veces. 20s alcanza para eliminar esa redundancia sin
    // arriesgar datos viejos para una decisión real de negocio (el propio
    // reporting de Meta ya tiene minutos de lag por atribución). No aplica
    // a metaGraphPost/metaGraphPostRaw — las mutaciones (pausar, cambiar
    // presupuesto, lanzar campaña) siguen yendo sin caché, a propósito.
    const res = await fetch(`${META_GRAPH_URL}${path}${separator}access_token=${token}`, {
      next: { revalidate: 20 },
    })
    const data = (await res.json()) as T & GraphErrorBody
    if (data.error) {
      return { ok: false, error: readableGraphError(data.error, 'Error desconocido de Meta.') }
    }
    return { ok: true, data: data as T }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red.' }
  }
}

export async function metaGraphPost(
  path: string,
  token: string,
  params: Record<string, string>
): Promise<MetaMutationResult> {
  const result = await metaGraphPostRaw(path, token, params)
  return result.ok ? { ok: true } : result
}

export async function metaGraphPostRaw(
  path: string,
  token: string,
  params: Record<string, string>
): Promise<MetaCreateResult> {
  try {
    const res = await fetch(`${META_GRAPH_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...params, access_token: token }),
    })
    const data = (await res.json()) as GraphErrorBody & { id?: string }
    if (data.error) {
      return { ok: false, error: readableGraphError(data.error, 'Meta rechazó el cambio.') }
    }
    return { ok: true, id: data.id ?? '' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red.' }
  }
}
