// Bug real encontrado (2026-08-06): el try/catch de diagnóstico agregado en
// campaigns/page.tsx atrapaba "DYNAMIC_SERVER_USAGE" — la señal interna que
// tira Next.js cuando prueba prerenderizar estáticamente una ruta que usa
// `searchParams` (pasa en build, Next la atrapa solo y marca la ruta como
// dinámica) — y la mostraba como si fuera un error real de la app. Mismo
// criterio que ya usábamos para NEXT_REDIRECT/NEXT_NOT_FOUND: hay que
// dejar pasar estas excepciones de control de flujo de Next, nunca
// tratarlas como una excepción nuestra.
const NEXT_INTERNAL_DIGESTS = ['DYNAMIC_SERVER_USAGE']

export function isNextInternalControlFlow(err: unknown): boolean {
  if (!err || typeof err !== 'object' || !('digest' in err) || typeof err.digest !== 'string') {
    return false
  }
  return err.digest.startsWith('NEXT_') || NEXT_INTERNAL_DIGESTS.includes(err.digest)
}
