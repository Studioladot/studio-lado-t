import { META_GRAPH_URL } from './oauth'

export type GraphErrorBody = { error?: { message?: string } }
export type MetaMutationResult = { ok: true } | { ok: false; error: string }
export type MetaCreateResult = { ok: true; id: string } | { ok: false; error: string }

export async function metaGraphGet<T>(
  path: string,
  token: string
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const separator = path.includes('?') ? '&' : '?'
    const res = await fetch(`${META_GRAPH_URL}${path}${separator}access_token=${token}`)
    const data = (await res.json()) as T & GraphErrorBody
    if (data.error) {
      return { ok: false, error: data.error.message ?? 'Error desconocido de Meta.' }
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
      return { ok: false, error: data.error.message ?? 'Meta rechazó el cambio.' }
    }
    return { ok: true, id: data.id ?? '' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red.' }
  }
}
