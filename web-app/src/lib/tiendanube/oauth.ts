import { createHmac, timingSafeEqual } from 'node:crypto'

export const TIENDANUBE_OAUTH_STATE_COOKIE = 'tiendanube_oauth_state'

// ---------------------------------------------------------------------------
// Link de conexión por cuenta (2026-11-13)
// ---------------------------------------------------------------------------
// Tienda Nube conecta la tienda con la sesión abierta en el navegador. Para
// no tener que cerrar sesión y volver a entrar con cada tienda, cada cuenta
// de Gotix genera un link que se abre en otro perfil de Chrome / ventana de
// incógnito (donde está abierta esa tienda) o se le manda al dueño de la
// tienda. El link es la autorización de Tienda Nube con un `state` firmado
// que dice a qué cuenta va: el callback no necesita sesión de Gotix en ese
// navegador. Firmado con el client secret de la app (solo servidor), vence
// en LINK_TTL_HOURS y no se guarda nada en la base.

export const LINK_STATE_PREFIX = 'l.'
const LINK_TTL_HOURS = 48

type LinkPayload = { o: string; u: string; e: number }

function sign(data: string, secret: string) {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

export function buildTiendaNubeConnectLink(organizationId: string, userId: string): string | null {
  const clientId = process.env.TIENDANUBE_CLIENT_ID
  const secret = process.env.TIENDANUBE_CLIENT_SECRET
  if (!clientId || !secret) return null
  const payload: LinkPayload = { o: organizationId, u: userId, e: Math.floor(Date.now() / 1000) + LINK_TTL_HOURS * 3600 }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const state = `${LINK_STATE_PREFIX}${data}.${sign(data, secret)}`
  return `https://www.tiendanube.com/apps/${clientId}/authorize?state=${encodeURIComponent(state)}`
}

/** Devuelve la cuenta y el usuario del link si la firma es válida y no venció. */
export function verifyTiendaNubeLinkState(state: string): { organizationId: string; userId: string } | null {
  const secret = process.env.TIENDANUBE_CLIENT_SECRET
  if (!secret || !state.startsWith(LINK_STATE_PREFIX)) return null
  const [data, sig] = state.slice(LINK_STATE_PREFIX.length).split('.')
  if (!data || !sig) return null
  const expected = Buffer.from(sign(data, secret))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const p = JSON.parse(Buffer.from(data, 'base64url').toString()) as LinkPayload
    if (!p.o || !p.u || typeof p.e !== 'number' || p.e < Date.now() / 1000) return null
    return { organizationId: p.o, userId: p.u }
  } catch {
    return null
  }
}
