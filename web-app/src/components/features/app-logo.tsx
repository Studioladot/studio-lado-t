import Image from 'next/image'

// Logo GOTIX x LADO T — versión negra para modo claro y blanca para modo
// oscuro; el CSS de globals.css (.logo-for-light / .logo-for-dark) muestra
// la que corresponde sin esperar a que hidrate React.
export function AppLogo({ width = 240, priority = false }: { width?: number; priority?: boolean }) {
  const height = Math.round((width * 189) / 1020)
  return (
    <span className="inline-flex" aria-label="GOTIX x LADO T" role="img">
      <Image src="/brand/logo-light.png" alt="" width={width} height={height} priority={priority} className="logo-for-light" />
      <Image src="/brand/logo-dark.png" alt="" width={width} height={height} priority={priority} className="logo-for-dark" />
    </span>
  )
}
