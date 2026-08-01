-- tiktok_connections — mismo shape y mismas 4 policies RLS que
-- instagram_connections (20260730150000_instagram_content_os.sql:17-48),
-- separada de esa tabla porque el OAuth de TikTok (login.tiktok.com,
-- client_key/client_secret propios, PKCE) no tiene nada que ver con el
-- login de Meta que usa Instagram. access_token/refresh_token porque la
-- API de TikTok usa refresh tokens de verdad (a diferencia del long-lived
-- token de Meta) — expires_at es del access_token, no de la conexión.
--
-- Fase 2 (no en esta entrega): esta tabla queda lista para que
-- api/tiktok/callback/route.ts y supabase/functions/tiktok-publish-run
-- la usen apenas exista una app de TikTok Developer con acceso a la
-- Content Posting API — hoy no hay ningún caller real, solo el modelo de
-- datos y la UI de conexión (deshabilitada) que la consultan para saber
-- si mostrar "conectado".
create table if not exists tiktok_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tiktok_open_id text not null,
  tiktok_username text,
  avatar_url text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  unique (organization_id)
);

alter table tiktok_connections enable row level security;

create policy "org members read tiktok connections"
  on tiktok_connections for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write tiktok connections"
  on tiktok_connections for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update tiktok connections"
  on tiktok_connections for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members delete tiktok connections"
  on tiktok_connections for delete
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create index if not exists tiktok_connections_org_idx on tiktok_connections (organization_id);
