'use client'

import { useState } from 'react'
import { MetaConnectionsIcon, TiendaNubeIcon } from './nav-icons'

type Brand = 'meta' | 'tiendanube'

// Isotipos oficiales de marca (identidad visual, 2026-08-04) — a diferencia
// del resto de nav-icons.tsx, estos NO usan currentColor: Meta y Tiendanube
// tienen su propio color de marca y no deben heredar el color del texto que
// los rodea. Archivos reales en public/ (subidos a mano, no se pueden bajar
// desde acá): meta.svg es el isologo completo de Meta (ícono + wordmark,
// NO es cuadrado — por eso `size` es la ALTURA, el ancho se ajusta solo
// manteniendo proporción; forzarlo a un cuadrado lo deja ilegible).
// Mientras el archivo no esté, cae al ícono genérico anterior (onError) en
// vez de mostrar un ícono roto.
const LOGO_SRC: Record<Brand, string> = {
  meta: '/meta.svg',
  tiendanube: '/tiendanube.png',
}

const BRAND_LABEL: Record<Brand, string> = {
  meta: 'Meta',
  tiendanube: 'Tiendanube',
}

function FallbackIcon({ brand, size }: { brand: Brand; size: number }) {
  return brand === 'meta' ? <MetaConnectionsIcon size={size} /> : <TiendaNubeIcon size={size} />
}

/**
 * CAVEAT CONOCIDO (2026-08-04, ver capturas en la conversación): el
 * meta.svg provisto es la variante de texto oscuro (#1c2b33) — legible
 * sobre fondos claros (tarjetas de Conexiones en modo claro), pero casi
 * invisible sobre el sidebar oscuro (#14161D) o tarjetas en modo oscuro
 * (#181c25), que son tonos igual de oscuros. tiendanube.png es al revés:
 * el ícono es blanco, perfecto sobre el sidebar/modo oscuro, invisible
 * sobre tarjetas en modo claro. ninguno de los dos assets sirve en los 4
 * contextos (sidebar siempre oscuro + tarjeta clara/oscura según tema) —
 * hace falta la variante alternativa de cada marca (reverse/white para
 * Meta, a color para Tiendanube) para resolverlo del todo sin alterar el
 * isologo oficial a mano.
 */
export function BrandLogo({ brand, size = 18 }: { brand: Brand; size?: number }) {
  const [failed, setFailed] = useState(false)

  if (failed) return <FallbackIcon brand={brand} size={size} />

  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo externo en public/, no una imagen de contenido (no aplica next/image).
    <img
      src={LOGO_SRC[brand]}
      alt={BRAND_LABEL[brand]}
      height={size}
      style={{ height: size, width: 'auto', objectFit: 'contain' }}
      onError={() => setFailed(true)}
    />
  )
}
