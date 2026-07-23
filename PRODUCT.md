# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dueños/as de negocio que operan su propia marca de forma autogestionada — no una agencia operando cuentas de terceros. Cada organización en Gotix representa un negocio independiente (hoy: KIRIZ y SINAI). El modelo técnico permite que un mismo usuario pertenezca a más de una organización (`organization_members` es N:N) y cambie de contexto activo con el selector de organización, pero el caso de uso principal confirmado es un dueño de negocio gestionando su propia operación día a día, no un operador central gestionando marcas ajenas.

## Product Purpose

Sistema operativo de negocio: unifica en un solo lugar lo que hoy vive disperso en Meta Ads Manager, planillas de márgenes, el panel de Tienda Nube y Mercado Pago — y además le dice al dueño del negocio qué decisión tomar hoy (qué anuncio pausar, a cuál subirle presupuesto), no solo le muestra métricas.

## Positioning

Confirmado por el usuario: unificación de datos y asistencia de decisiones pesan igual, ninguna es secundaria de la otra. Un competidor que solo centralice datos (dashboard de métricas) o que solo dé recomendaciones sin integrar los sistemas reales (ads + finanzas + e-commerce + pagos) no podría reclamar lo mismo que Gotix.

## Operating Context

- Gestión de contenido/campañas (content_posts, content_campaigns).
- Finanzas reales — márgenes, no solo métricas de vanidad de las plataformas de ads (finances, payment_gateway_fees).
- Integración con Meta Ads (conexión OAuth, métricas, refresh de tokens) vía meta_connections y las funciones serverless en api/meta-*.js.
- Integración con Tienda Nube (pedidos, productos) vía api/tiendanube-*.js.
- Suscripciones/pagos vía Mercado Pago (api/mp-*.js, webhooks/mercadopago.js).
- Feed de "Decisiones pendientes" con análisis asistido sobre qué anuncios necesitan atención, y chat con IA (api/ia-chat.js).
- Multi-tenant: cada organización aislada por RLS vía organization_members; el usuario elige la organización activa y esa elección persiste entre sesiones.

## Capabilities and Constraints

- **Migración en curso (Strangler Fig):** el monolito legacy (`app.html`, ~16.000 líneas Vanilla JS, en la raíz del repo) sigue sirviendo tráfico real de KIRIZ y SINAI mientras `web-app/` (Next.js 16 App Router) se construye al lado, módulo por módulo. `app.html` es la autoridad de comportamiento incumbente para todo lo que todavía no se migró — no se reemplaza a ciegas, se trata como evidencia real de qué debe seguir funcionando.
- Backend en Supabase, ya migrado a multi-tenant: tablas `organizations`/`organization_members`, `organization_id` en ~20 tablas de negocio, RLS reescrito, triggers de retrocompatibilidad para que la app legacy siga funcionando durante la transición.
- Autenticación: email/password + Google OAuth (Supabase Auth), sesión gestionada vía `src/proxy.ts` (Next.js 16 — `middleware.ts` está deprecado en esta versión).
- Sistema de diseño real ya documentado en `web-app/frontend-taste.md` — paleta, tipografía y componentes de referencia extraídos literalmente de `app.html`. No es un gap a llenar por `document`/`new-work`; ya existe y es la fuente de verdad visual.

## Brand Commitments

- Nombre: **Gotix**. Tagline confirmado: **"Sistema Operativo de Negocios"**.
- Assets de logo existentes: `LOGO.png`, `logo-gotix.png` (raíz del repo), ya copiado a `web-app/public/logo-gotix.png`.

## Evidence on Hand

- `app.html` — implementación real en producción, autoridad de comportamiento e interfaz incumbente.
- `web-app/frontend-taste.md` — sistema visual real ya extraído y documentado (paleta "Mineral y Tinta", tipografía Inter, precedentes de login/dashboard). No inventar colores fuera de este archivo.
- Dos tenants reales activos hoy: KIRIZ y SINAI.
- Sin testimonios, casos de estudio, pricing público ni benchmarks registrados — no inventar ninguno de estos si hace falta contenido de ese tipo en el futuro.

## Product Principles

1. Unificar herramientas fragmentadas (ads, finanzas, e-commerce, pagos) en un solo sistema operado por el propio dueño del negocio.
2. No solo mostrar datos — señalar la decisión concreta de hoy (feed de decisiones, chat IA).
3. Los márgenes reales son la fuente de verdad para decidir, no las métricas de vanidad que reportan las plataformas de ads.
4. Migrar incrementalmente (Strangler Fig) sin interrumpir a los tenants reales que ya operan sobre el monolito.
