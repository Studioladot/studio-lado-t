-- Instagram Content OS — conexión, scheduling y analítica orgánica.
-- SaaS B2B multi-tenant: toda tabla nueva lleva organization_id propio
-- (no solo vía join) + RLS estricto por organization_members, mismo
-- criterio que operating_costs/campaign_targets/autopilot_playbook_settings.
-- Las tablas de solo-lectura para el usuario (instagram_media_insights,
-- instagram_account_insights) siguen el patrón de autopilot_run_log: policy
-- de select para miembros de la organización, sin policy de insert para
-- authenticated — solo la Edge Function (service_role, bypassea RLS)
-- escribe ahí.

-- ── instagram_connections ────────────────────────────────────────────────
-- Separada de meta_connections a propósito: el token acá es de Página
-- (no de cuenta publicitaria) y una organización puede tener Ads sin
-- Instagram o viceversa. unique(organization_id) — una sola cuenta de
-- Instagram conectada por organización, mismo criterio de "delete-then-
-- insert" que ya usa saveMetaConnection en src/lib/meta/connections.ts.
create table if not exists instagram_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  page_id text not null,
  page_name text,
  ig_user_id text not null,
  ig_username text,
  profile_picture_url text,
  page_access_token text not null,
  connected_at timestamptz not null default now(),
  unique (organization_id)
);

alter table instagram_connections enable row level security;

create policy "org members read instagram connections"
  on instagram_connections for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write instagram connections"
  on instagram_connections for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update instagram connections"
  on instagram_connections for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members delete instagram connections"
  on instagram_connections for delete
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create index if not exists instagram_connections_org_idx on instagram_connections (organization_id);

-- ── content_piezas: columnas de scheduling/publicación ───────────────────
-- Solo ALTER — la tabla ya tiene RLS org-scoped desde su creación original
-- (organization_id ya existe, ver database.types.ts), agregar columnas no
-- requiere tocar policies porque siguen filtrando por la misma columna.
-- fecha_planificada/turno NO se tocan — son datos editoriales del
-- calendario visual; scheduled_at es un dato operacional nuevo y separado,
-- exclusivo del pipeline de auto-publish.
alter table content_piezas
  add column if not exists scheduled_at timestamptz,
  add column if not exists publish_status text not null default 'none'
    check (publish_status in ('none', 'scheduled', 'publishing', 'published', 'failed')),
  add column if not exists ig_container_id text,
  add column if not exists ig_media_id text,
  add column if not exists ig_permalink text,
  add column if not exists publish_error text,
  add column if not exists published_at timestamptz;

-- Índice parcial: la Edge Function corre cada 5-10 min y solo le importan
-- las filas 'scheduled' vencidas — un índice sobre la tabla completa sería
-- desperdicio, uno parcial mantiene esa consulta barata sin importar cuánto
-- crezca el historial de piezas ya publicadas.
create index if not exists content_piezas_scheduled_pending_idx
  on content_piezas (scheduled_at)
  where publish_status = 'scheduled';

-- ── instagram_media_insights ─────────────────────────────────────────────
-- Snapshot diario cacheado por pieza publicada — nunca fetch en vivo desde
-- el navegador (rate limits + ventanas de retención cortas de la Insights
-- API). unique(piece_id, captured_at) es el target de upsert de
-- instagram-metrics-sync.
create table if not exists instagram_media_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  piece_id uuid not null references content_piezas(id) on delete cascade,
  captured_at date not null default current_date,
  plays numeric,
  reach numeric,
  likes numeric,
  comments numeric,
  shares numeric,
  saves numeric,
  unique (piece_id, captured_at)
);

alter table instagram_media_insights enable row level security;

create policy "org members read media insights"
  on instagram_media_insights for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

-- Sin policy de insert/update para authenticated a propósito — solo la
-- Edge Function (service_role) escribe acá, mismo criterio que
-- autopilot_run_log.

create index if not exists instagram_media_insights_org_idx on instagram_media_insights (organization_id, captured_at);

-- ── instagram_account_insights ───────────────────────────────────────────
-- Serie diaria a nivel cuenta (seguidores, reach, impresiones) — permite
-- cruzar picos de reproducciones de un Reel puntual con picos de
-- seguidores nuevos sin depender de datos en vivo.
create table if not exists instagram_account_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  captured_at date not null default current_date,
  follower_count numeric,
  reach numeric,
  impressions numeric,
  unique (organization_id, captured_at)
);

alter table instagram_account_insights enable row level security;

create policy "org members read account insights"
  on instagram_account_insights for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

-- Sin policy de insert/update para authenticated — mismo criterio que arriba.

create index if not exists instagram_account_insights_org_idx on instagram_account_insights (organization_id, captured_at);

-- NOTA: el pg_cron + pg_net que dispara instagram-publish-run e
-- instagram-metrics-sync (mismo patrón que 20260724125608_autopilot_org_
-- scoped.sql, sección final) se agrega en una migración separada una vez
-- que esas Edge Functions estén deployadas — apuntar cron.schedule a una
-- función que todavía no existe fallaría en cada corrida sin avisar a nadie.
