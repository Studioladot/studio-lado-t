# Frontend Taste — Manifiesto de Diseño de Gotix

Fuente de verdad para todo componente visual nuevo en `web-app/`. Todos los valores de esta sección fueron **extraídos literalmente** de `app.html` (raíz del repo, líneas 12–100 para las variables, líneas 220–236 para el patrón de login real ya en producción). No se inventó ni "mejoró" ningún color.

## Paleta de colores de Gotix (fuente de verdad)

### Modo claro (`:root`)

| Variable | Valor exacto | Uso semántico |
|---|---|---|
| `--bg` | `#F5F5F3` | Fondo base de pantalla (detrás de las tarjetas) |
| `--surface` | `#FCFCFB` | Superficie de tarjetas, paneles, modales |
| `--surface2` | `#EBEBE8` | Superficie secundaria (hover de filas, inputs alternativos) |
| `--border` | `rgba(26,26,24,.08)` | Borde sutil por defecto |
| `--border2` | `rgba(26,26,24,.14)` | Borde más marcado (hover, foco de bajo énfasis) |
| `--text` | `#101828` | Texto primario |
| `--text2` | `#344054` | Texto secundario / labels |
| `--text3` | `#667085` | Texto terciario / placeholder |
| `--primary-green` | `#2D5B8A` | Color primario de marca. **Nota:** el nombre es histórico y engañoso — pese a llamarse "green", el valor real es azul acero. No se renombra la variable: se prioriza la trazabilidad con `app.html` (legacy) por sobre la prolijidad del nombre. Al portarlo a Tailwind/`@theme`, usar un token nuevo con nombre correcto (ej. `--color-primary`), pero el valor debe seguir siendo `#2D5B8A` / `#5B8FCC` (dark) sin excepción |
| `--primary-green-glow` | `rgba(45,91,138,.3)` | Glow/resplandor sobre elementos primarios |
| `--primary-green-l` | `rgba(45,91,138,.06)` | Fondo tenue tintado con el primario |
| `--primary-green-m` | `rgba(45,91,138,.1)` | Fondo tintado, énfasis medio |
| `--primary-green-border` | `rgba(45,91,138,.25)` | Borde tintado con el primario |
| `--accent` | `#2D5B8A` | Alias de `--primary-green`, usar para focus rings y acentos interactivos |
| `--accent-l` | `rgba(45,91,138,.06)` | Fondo tenue de acento |
| `--accent-d` | `#234A70` | Acento oscuro — **usar en `:hover` de botones primarios** |
| `--accent-glow` | `rgba(45,91,138,.22)` | Glow de acento |
| `--green` | `#297353` | Semántico: éxito / positivo |
| `--green-l` | `rgba(41,115,83,.08)` | Fondo tenue de éxito |
| `--teal` | `#297353` | Alias de green en contextos "teal" |
| `--teal-l` | `rgba(41,115,83,.08)` | — |
| `--teal-d` | `#1F5A40` | Teal oscuro |
| `--amber` | `#a3690f` | Semántico: advertencia |
| `--amber-l` | `rgba(163,105,15,.1)` | Fondo tenue de advertencia |
| `--red` | `#AD342B` | Semántico: error / destructivo — **usar en mensajes de error de formularios** |
| `--red-l` | `rgba(173,52,43,.08)` | Fondo tenue de error |
| `--blue` | `#2D5B8A` | Alias semántico de info (= primario) |
| `--blue-l` | `rgba(45,91,138,.08)` | Fondo tenue de info |
| `--gotix-blue` | `#2D5B8A` | Legado — color de marca usado en `.auth-brand-name`, `.btn-primary` |
| `--gotix-blue-l` | `rgba(45,91,138,.06)` | — |
| `--gotix-blue-d` | `#234A70` | Legado — hover de `.btn-primary` |
| `--gotix-beige` | `#EBEBE8` | Legado — igual a `--surface2` |
| `--gotix-beige-d` | `#E4E4E0` | Legado — variante oscurecida de beige |
| `--r` | `8px` | Radio de borde chico — inputs, botones estándar |
| `--rl` | `14px` | Radio de borde grande — tarjetas, modales |

### Modo oscuro (`body.dark-mode`) — misma identidad, invertida

| Variable | Valor exacto | Uso semántico |
|---|---|---|
| `--bg` | `#12151C` | Fondo base |
| `--surface` | `#181C25` | Superficie de tarjetas |
| `--surface2` | `#232833` | Superficie secundaria |
| `--border` | `rgba(255,255,255,.08)` | Borde sutil |
| `--border2` | `rgba(255,255,255,.16)` | Borde marcado |
| `--text` | `#F5F5F3` | Texto primario |
| `--text2` | `#C0C5CE` | Texto secundario |
| `--text3` | `#8B93A3` | Texto terciario |
| `--primary-green` / `--accent` | `#5B8FCC` | Primario en modo oscuro (mismo azul, aclarado para contraste) |
| `--primary-green-glow` | `rgba(91,143,204,.35)` | Glow |
| `--primary-green-l` | `rgba(91,143,204,.12)` | Fondo tenue |
| `--primary-green-m` | `rgba(91,143,204,.18)` | Fondo tintado medio |
| `--primary-green-border` | `rgba(91,143,204,.35)` | Borde tintado |
| `--accent-d` | `#8FB4E0` | Acento "oscuro" en dark mode (en realidad más claro, para hover) |
| `--accent-glow` | `rgba(91,143,204,.3)` | Glow de acento |
| `--green` / `--teal` | `#3EBA85` | Éxito |
| `--teal-d` | `#6ED4A6` | Teal claro |
| `--amber` | `#E0A030` | Advertencia |
| `--red` | `#E5645A` | Error |
| `--blue` | `#5B8FCC` | Info |

`--r` y `--rl` no cambian entre temas (8px / 14px).

### Tipografía real

```
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

Cargada desde Google Fonts con los pesos `400;500;600;700;800`. Tamaño base del body: `14px`, `line-height:1.55`, `letter-spacing:-0.01em`.

### Implementación en este proyecto (Tailwind v4)

Este proyecto usa **Tailwind v4**, que ya no usa `tailwind.config.ts` por defecto — los tokens se declaran vía `@theme` directamente en `src/app/globals.css`. Los valores de esta tabla deben volcarse ahí como custom properties (`--color-bg`, `--color-surface`, `--color-primary`, etc. dentro del bloque `@theme`), **nunca inventar valores nuevos fuera de esta tabla.**

## Precedente: login legacy (`app.html` líneas 220–236)

`app.html` ya tiene una pantalla de login en producción (`#auth-screen`, `.auth-card`, `.field`, `.btn-primary`). Este es el precedente visual **obligatorio** para cualquier login nuevo — el objetivo es que se sienta como **la misma pantalla mejorada**, no un diseño distinto que solo comparte paleta. Toda la Tarea 3 debe replicar estos valores con fidelidad exacta, no reinterpretarlos.

### Contenedor de pantalla (`#auth-screen`)

| Propiedad | Valor exacto |
|---|---|
| `display` | `flex`, `align-items:center`, `justify-content:center` |
| `min-height` | `100vh` |
| `padding` | `20px` |
| `background` | `var(--bg)` — el fondo de pantalla, NO el de la tarjeta |

### Tarjeta (`.auth-card`)

| Propiedad | Valor exacto |
|---|---|
| `background` | `var(--surface)` |
| `border` | `0.5px solid var(--border)` |
| `border-radius` | `var(--rl)` → `14px` |
| `padding` | `44px 40px` |
| `width` | `100%`, `max-width:400px` |
| `box-shadow` | `0 4px 24px rgba(0,0,0,.03)` — sombra muy sutil, no dura |

### Marca (`.auth-brand-name` / `.auth-brand-tag`)

| Propiedad | Valor exacto |
|---|---|
| `.auth-brand-name` font-size | `26px` |
| `.auth-brand-name` font-weight | `800` |
| `.auth-brand-name` letter-spacing | `-0.04em` |
| `.auth-brand-name` color | `var(--gotix-blue)` (= `#2D5B8A`) |
| `.auth-brand-tag` font-size | `11px`, `font-weight:600`, `color:var(--teal)`, `text-transform:uppercase`, `letter-spacing:.1em` |
| `.auth-sub` (subtítulo) | `font-size:13px`, `color:var(--text2)`, `letter-spacing:.08em`, `margin-top:4px`, `margin-bottom:32px` |

### Campos (`.field`)

| Propiedad | Valor exacto |
|---|---|
| `.field` contenedor | `display:flex`, `flex-direction:column`, `gap:5px`, `margin-bottom:14px` |
| `.field label` | `font-size:11px`, `font-weight:600`, `color:var(--text2)`, `text-transform:uppercase`, `letter-spacing:.06em` |
| `.field input` | `border:1px solid #D0D5DD`, `border-radius:var(--r)` → `8px`, `padding:10px 12px`, `background:#F9FAFB`, `color:var(--text)` |
| `.field input:focus` | `border-color:var(--accent)`, `box-shadow:0 0 0 3px rgba(45,91,138,.12)` |

### Botón (`.btn-primary`)

| Propiedad | Valor exacto |
|---|---|
| `width` | `100%` |
| `padding` | `11px` |
| `border-radius` | `20px` (nota: es un valor propio, mayor que `--r`/`--rl` — el botón de login es deliberadamente más "pill" que el resto de la UI) |
| `background` | `var(--gotix-blue)` |
| `color` | `#fff` |
| `font-size` | `14px`, `font-weight:600` |
| `:hover background` | `var(--gotix-blue-d)` (= `#234A70`) |

### Mensaje de error (`.auth-msg`)

| Propiedad | Valor exacto |
|---|---|
| `font-size` | `12px` |
| `color` | `var(--red)` |
| `margin-top` | `10px` |
| `min-height` | `16px` (reserva espacio para que no salte el layout cuando aparece el error) |

### Pestañas (`.auth-tabs` / `.auth-tab`)

| Propiedad | Valor exacto |
|---|---|
| `.auth-tabs` contenedor | `display:flex`, `border:0.5px solid var(--border)`, `border-radius:var(--r)` → `8px`, `overflow:hidden`, `margin-bottom:24px` |
| `.auth-tab` | `flex:1`, `padding:9px`, `font-size:13px`, `font-weight:500`, `color:var(--text2)`, `letter-spacing:.08em`, `transition:all .15s` (portado como `duration-200 ease-out`) |
| `.auth-tab.active` | `background:var(--gotix-blue)`, `color:#fff` |

Comportamiento real (`app.html:4862-4863`): un solo par de campos email/contraseña compartido entre "Ingresar" y "Registrarse" — la pestaña activa solo cambia qué llamada de Supabase dispara el submit (`signInWithPassword` vs `signUp`), no el formulario.

### Botón "Continuar con Google"

Precedente real en `app.html:1388-1396` y `app.html:4877-4882` (`supabase.auth.signInWithOAuth({ provider: 'google' })`).

| Propiedad | Valor exacto |
|---|---|
| `background` | `#fff` (blanco explícito, no `var(--surface)` — es una excepción documentada, así está en el legado) |
| `color` | `#3C4043` (gris oficial de Google, no un token de la paleta) |
| `border` | `1px solid #D0D5DD` (mismo gris que el borde de `.field input`) |
| `border-radius` | `10px` (otro valor propio — ni `--r` ni `--rl` ni el `20px` del botón primario) |
| `padding` | `12px 18px` |
| ícono | SVG oficial de Google de 4 colores (`#4285F4`/`#34A853`/`#FBBC05`/`#EA4335`), 18×18px |
| separador "o" | dos líneas de `1px` en `var(--border)` con `var(--text3)` centrado, `font-size:11px` |

## Precedente: banner de bienvenida del dashboard (`app.html:1479-1529`, CSS en `app.html:262-390`)

### Header de página (`.page-hdr` / `.page-title` / `.page-sub`)

| Propiedad | Valor exacto |
|---|---|
| `.page-hdr` | `display:flex`, `align-items:flex-start`, `justify-content:space-between`, `flex-wrap:wrap`, `gap:12px`, `margin-bottom:22px` |
| `.page-title` | `font-size:22px`, `font-weight:700`, `letter-spacing:-.03em` |
| `.page-sub` | `font-size:13px`, `color:var(--text2)`, `margin-top:2px` |

### Botón "+ Cargar métricas" (`.btn-accent`)

| Propiedad | Valor exacto |
|---|---|
| `padding` | `10px 18px` |
| `border-radius` | `var(--r)` → `8px` |
| `background` | `var(--primary-green)` |
| `box-shadow` | `0 0 16px var(--primary-green-glow)` — **el glow cambia entre temas** (`rgba(45,91,138,.3)` claro / `rgba(91,143,204,.35)` oscuro), a diferencia de otras sombras del legado que quedan fijas |
| `:hover` | `background:var(--accent-d)`, `box-shadow:0 0 28px var(--primary-green-glow), 0 0 8px rgba(45,91,138,.2)` |

### Banner "LA BASE DE TU NEGOCIO" (`.dash-hero`)

Gradiente multicapa + glow radial vía pseudo-elemento — implementado como clase CSS plana en `globals.css` (no como utilidad de Tailwind), documentado ahí mismo.

| Propiedad | Valor exacto (claro) | Valor exacto (oscuro) |
|---|---|---|
| `background` | `linear-gradient(135deg, rgba(45,91,138,.07) 0%, transparent 55%), rgba(26,26,24,.025)` | `linear-gradient(135deg, rgba(91,143,204,.09) 0%, transparent 55%), rgba(255,255,255,.02)` |
| `border` | `1px solid rgba(26,26,24,.07)` | `1px solid rgba(255,255,255,.09)` |
| `box-shadow` | `0 4px 40px rgba(0,0,0,.08)` (fijo, sin variante oscura documentada en el legado) | (igual) |
| `border-radius` | `var(--rl)` → `radius-card` (14px) | |
| `::before` (glow) | `radial-gradient(circle, rgba(45,91,138,.13) 0%, transparent 70%)`, 340×340px, `top:-60px;left:-60px` | (igual, no tiene variante oscura en el legado) |

| Sub-elemento | Valor exacto |
|---|---|
| `.dash-hero-title` | `font-size:22px`, `font-weight:800`, `letter-spacing:-.03em` |
| `.dash-hero-sub` | `font-size:13px`, `color:#5E5E5A` (gris literal, no tokenizado), `max-width:380px`, `line-height:1.6` |
| `.dash-hero-cta` | `border:1px solid var(--primary-green-border)` (= 25% opacidad), `color:var(--primary-green)`, `padding:9px 16px`, `border-radius:var(--r)`, `box-shadow:0 0 12px rgba(45,91,138,.1)` |
| `.dash-hero-cta:hover` | `background:var(--primary-green-l)` (6% opacidad), `box-shadow:0 0 24px rgba(45,91,138,.2)` |
| `.dash-hero-video` | `aspect-ratio:16/10`, `border-radius:var(--r)`, `background:#EBEBE8`, `box-shadow:0 8px 32px rgba(0,0,0,.09)` |
| `.dash-hero-play-btn` | círculo `52px`, `border:1px solid rgba(255,255,255,.4)`, `background:rgba(26,26,24,.55)`, `backdrop-filter:blur(8px)` |
| `.dash-hero-badge` | `font-size:10px`, `background:rgba(26,26,24,.65)`, `border:1px solid rgba(255,255,255,.15)`, `border-radius:6px`, posición `bottom:10px;left:10px` |

## Principios de interacción

Inspirados en los principios de micro-interacción de Emil Kowalski / Vercel (sin copiar componentes ajenos):

- Todo elemento interactivo lleva `transition-all duration-200 ease-out` como base.
- Estados `:hover` sutiles — cambio de opacidad, borde o brillo, nunca saltos bruscos de color. En este proyecto: usar `--accent-d` / `--gotix-blue-d` para hover de superficies primarias, nunca un color fuera de la paleta.
- Estados `:active` con `active:scale-[0.98]` para dar feedback táctil.
- Estados de foco visibles y accesibles: `focus-visible:ring-2` con el color `--accent` (`#2D5B8A` claro / `#5B8FCC` oscuro). Nunca `outline-none` sin un reemplazo visual equivalente.
- Loading states con skeleton o spinner sutil — nunca pantallas en blanco mientras se espera una respuesta.

## Principios de espaciado y layout

- Whitespace generoso como herramienta de jerarquía — no rellenar cada espacio vacío.
- Escala de espaciado consistente: `4 / 8 / 12 / 16 / 24 / 32 / 48px`.
- Grillas con `gap` tomado siempre de esa escala, nunca valores arbitrarios.
- Ancho máximo de contenido en pantallas grandes (ej. `max-w-md` para tarjetas de auth, replicando el `max-width:400px` real de `.auth-card`).

## Bordes y sombras

- Bordes finos de `1px` (o `0.5px` como en el legado) con opacidad baja — usar `--border` / `--border2` reales, nunca `border-white/10` genérico de Tailwind sin pasar por estas variables.
- Radios de borde consistentes: `--r` (8px) para inputs y botones estándar, `--rl` (14px) para tarjetas y modales.
- Sombras difuminadas de blur alto y opacidad baja para dar profundidad sin peso visual. Referencia real: `box-shadow:0 4px 24px rgba(0,0,0,.03)` (auth-card) y `0 8px 30px rgba(0,0,0,.12)` como techo superior para elementos más elevados (modales). Nunca usar `shadow-lg` de Tailwind por defecto sin ajustar a estos valores.

## Tono visual de referencia

Minimalista, en la línea de Cult UI / marcas urbanas premium (ej. Nude Project): mucho espacio negativo, tipografía como protagonista, color usado con moderación y solo donde aporta jerarquía — pero **siempre dentro de la paleta real de Gotix** documentada arriba, nunca con colores nuevos.

## Prohibiciones explícitas

- No usar gradientes genéricos de librería (el único gradiente válido es el `--atmosphere` real del `app.html`, un radial-gradient muy sutil tintado con el acento).
- No usar sombras duras (`shadow-lg` de Tailwind por defecto sin ajustar).
- No usar colores fuera de la paleta documentada en este archivo.
- No usar animaciones mayores a `300ms` para micro-interacciones.
