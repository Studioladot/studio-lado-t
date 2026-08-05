export const META_OAUTH_STATE_COOKIE = 'meta_oauth_state'
// Guarda el token + la lista de cuentas publicitarias mientras el usuario
// elige cuál vincular (cuando tiene más de una) — vida corta, se borra apenas
// se confirma la selección o si expira sin uso.
export const META_OAUTH_PENDING_COOKIE = 'meta_oauth_pending'
// Mismo criterio, pero para cuando el usuario tiene más de una Página con
// una cuenta de Instagram Business/Creator conectada — antes este caso se
// descartaba en silencio (2026-07-30), causando el bug real de "me conecté
// pero Rendimiento sigue pidiendo Instagram" que reportó la PO.
export const INSTAGRAM_OAUTH_PENDING_COOKIE = 'instagram_oauth_pending'
export const META_GRAPH_VERSION = 'v19.0'
export const META_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`
// pages_show_list se sumó para "Lanzar Testeo": crear un anuncio con imagen y
// copy (object_story_spec) requiere publicar a nombre de una Página de
// Facebook — sin este permiso no podemos ni listar qué páginas administra el
// usuario. Las conexiones existentes (creadas antes de este cambio) van a
// necesitar reconectar para que el token tenga este scope.
//
// instagram_basic/instagram_manage_insights/pages_read_engagement se
// sumaron para la integración de Instagram (2026-07-30) — mismo login de
// Facebook, la cuenta de Instagram Business/Creator se resuelve vía la
// Página vinculada (getInstagramBusinessAccounts, src/lib/instagram/accounts.ts).
// Es el mínimo scope real: sin instagram_manage_insights no hay métricas,
// sin pages_read_engagement no se puede leer instagram_business_account en
// /me/accounts. Conexiones existentes van a necesitar reconectar otra vez.
//
// instagram_content_publish se sacó (2026-08-05) — el pivot de producto
// dejó a Gotix como planificación/BI únicamente (Content/Campañas termina
// en production_status, sin auto-publicar nada); pedirle a Meta un permiso
// que la app no usa de verdad arriesga que rechacen la revisión completa,
// ya que cada permiso pedido exige demostrar su caso de uso real.
export const META_OAUTH_SCOPE =
  'ads_read,ads_management,business_management,pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights'
