-- tiktok_videos — catálogo de los videos que ya existen en la cuenta de
-- TikTok conectada (sincronizados vía Display API, video.list), NO
-- publicaciones creadas a través de Gotix. A diferencia de
-- instagram_media_insights (que trackea el historial de MÉTRICAS en el
-- tiempo de contenido publicado por Gotix, polimórfico contra
-- content_posts/content_piezas), esta tabla es un catálogo con snapshot de
-- estadísticas ACTUALES por video — la Display API de TikTok da totales
-- vigentes, no series históricas diarias como sí sincroniza
-- instagram-metrics-sync, así que no hay un "captured_at" con el que armar
-- una curva de crecimiento por ahora (ver src/lib/tiktok/winners.ts:
-- detección por promedio de la cuenta, no por delta en el tiempo).
--
-- video_download_url queda nullable a propósito: la Display API de TikTok
-- no garantiza un MP4 descargable para apps de terceros fuera de acceso
-- elevado — se completa si el campo viene en la respuesta, si no el flujo
-- de cross-post a Instagram cae a "descargalo vos y subilo" en vez de
-- fingir que siempre se puede clonar el archivo solo.
create table if not exists tiktok_videos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tiktok_video_id text not null,
  description text,
  cover_image_url text,
  share_url text,
  video_download_url text,
  duration_seconds integer,
  posted_at timestamptz,
  view_count integer not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  share_count integer not null default 0,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, tiktok_video_id)
);

alter table tiktok_videos enable row level security;

create policy "org members read tiktok videos"
  on tiktok_videos for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write tiktok videos"
  on tiktok_videos for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update tiktok videos"
  on tiktok_videos for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members delete tiktok videos"
  on tiktok_videos for delete
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create index if not exists tiktok_videos_org_idx on tiktok_videos (organization_id);
create index if not exists tiktok_videos_org_views_idx on tiktok_videos (organization_id, view_count desc);
