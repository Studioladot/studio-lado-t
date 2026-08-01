export const TIKTOK_OAUTH_STATE_COOKIE = 'tiktok_oauth_state'
// PKCE (RFC 7636) — TikTok exige code_challenge en /v2/auth/authorize/, así
// que el code_verifier tiene que sobrevivir el viaje de ida y vuelta igual
// que el state. Ver src/lib/tiktok/pkce.ts.
export const TIKTOK_OAUTH_VERIFIER_COOKIE = 'tiktok_oauth_verifier'

// Scopes mínimos para el flujo de Content Posting: user.info.basic para
// resolver username/avatar al conectar, video.list/video.publish/
// video.upload para el pipeline de publicación real de la Fase 2
// (tiktok-publish-run, todavía no escrito — ver
// supabase/migrations/20260804120500_tiktok_connections.sql). Pedirlos ya
// ahora evita tener que reconectar todas las cuentas cuando exista esa
// Edge Function.
export const TIKTOK_OAUTH_SCOPE = 'user.info.basic,video.list,video.publish,video.upload'

// v2 Login Kit — a diferencia de Meta, el authorize y el token exchange
// viven en hosts distintos (www.tiktok.com para el diálogo de login,
// open.tiktokapis.com para la API server-to-server).
export const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/'
export const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
export const TIKTOK_USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/'
