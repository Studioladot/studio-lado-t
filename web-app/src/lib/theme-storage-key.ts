// Bug real encontrado (2026-08-06): esta constante vivía en
// theme-toggle.tsx, un módulo 'use client' — layout.tsx (Server Component)
// la importaba para armar el script inline de anti-flash de tema.
// React Server Components serializa TODO lo que se exporta desde un
// módulo 'use client' como una referencia opaca de cliente, incluso una
// simple constante de string: al interpolarla del lado del servidor
// (`${THEME_STORAGE_KEY}`), lo que terminaba en el HTML no era 'gotix_theme'
// sino el texto de una función-stub que tira "Attempted to call
// THEME_STORAGE_KEY() from the server...", con comillas y paréntesis sin
// escapar — rompía la sintaxis del <script> en TODA la plataforma (se
// confirmó hasta en /terms y /privacy-policy, páginas estáticas sin
// relación con nada tocado en sesiones anteriores). Vive acá, en un
// módulo sin 'use client', para que tanto el Server Component como el
// Client Component importen el mismo string real.
export const THEME_STORAGE_KEY = 'gotix_theme'
