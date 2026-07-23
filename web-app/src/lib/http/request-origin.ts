import { headers } from 'next/headers'

/**
 * Origin de la request actual (protocolo + host), construido desde los
 * headers de proxy reales en vez de asumir un dominio fijo — funciona igual
 * en localhost, en un preview de Vercel, o en producción. Usado para
 * construir redirect_uri de flujos OAuth (Google, Meta).
 */
export async function getRequestOrigin() {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
  const protocol = headerList.get('x-forwarded-proto') ?? 'http'
  return `${protocol}://${host}`
}
