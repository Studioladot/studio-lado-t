import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// /auth/callback recibe el redirect de Supabase durante el login con Google,
// antes de que exista sesión — tiene que quedar público o el proxy lo
// mandaría a /login antes de poder intercambiar el code por la sesión.
//
// /privacy-policy y /data-deletion-status son compliance de Meta App Review
// — tienen que ser legibles sin sesión (por clientes y por el revisor de
// Meta). /api/meta/data-deletion es el webhook que Meta llama
// server-to-server sin ninguna cookie de Gotix: si no está acá, el proxy lo
// redirige a /login y el callback de Meta se rompe por completo (la
// autenticación real de esa ruta es la firma HMAC del signed_request, no
// una sesión — ver src/app/api/meta/data-deletion/route.ts).
const PUBLIC_PATHS = ['/login', '/auth', '/privacy-policy', '/data-deletion-status', '/api/meta/data-deletion']

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  let response = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() (no getSession()) fuerza la validación del token contra el
  // servidor de Supabase, refrescándolo si expiró.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Evita que el layout de (dashboard) tenga que volver a llamar a
    // supabase.auth.getUser(): el proxy ya validó el token, así que le
    // pasamos el user id como header de request para que el Server
    // Component confíe en esta validación en vez de repetirla.
    requestHeaders.set('x-user-id', user.id)
    const withUserHeader = NextResponse.next({ request: { headers: requestHeaders } })
    response.cookies.getAll().forEach((cookie) => withUserHeader.cookies.set(cookie))
    response = withUserHeader
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
