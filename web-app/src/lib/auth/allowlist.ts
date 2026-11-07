// Gotix es de uso interno (agencia): solo estas cuentas pueden entrar.
// Cada cliente sigue siendo una organización aparte; esto decide quién
// entra a la app, no qué organizaciones ve.
const PERMITIDOS = [
  'kirizproject@gmail.com',
  'studioladot@gmail.com',
]

export function tieneAcceso(email?: string | null): boolean {
  return !!email && PERMITIDOS.includes(email.trim().toLowerCase())
}
