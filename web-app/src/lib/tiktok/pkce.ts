import { randomBytes, createHash } from 'node:crypto'

// PKCE (RFC 7636) — el Login Kit v2 de TikTok lo exige (a diferencia de
// Meta/Tiendanube, que no lo piden): sin code_challenge, /v2/auth/authorize/
// devuelve "code_challenge faltante". code_verifier: 32 bytes random en
// base64url ya caen dentro del alfabeto permitido por la RFC
// (A-Za-z0-9-_~) sin necesidad de filtrar nada, y Buffer.toString('base64url')
// en Node no agrega padding — da un string de 43 caracteres, dentro del
// rango exigido (43-128). code_challenge = base64url(SHA256(code_verifier)),
// method S256 — el único que TikTok acepta, no soporta 'plain'.
export function generatePkcePair() {
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge }
}
