-- instagram_media_catalog — catálogo "zero fricción" del feed histórico +
-- Reels reales de la cuenta de Instagram conectada (Graph API /media,
-- paginado), NO publicaciones creadas a través de Gotix. Mismo criterio
-- arquitectónico ya usado para tiktok_videos (2026-08-01): esta tabla es
-- un catálogo con snapshot de estadísticas vigentes, independiente de
-- content_posts/content_piezas — instagram_media_insights (polimórfico
-- contra esas dos) sigue existiendo tal cual, para el tracking de
-- rendimiento en el tiempo de lo que Gotix publicó/programó. Puede haber
-- overlap real (un post publicado por Gotix también va a aparecer acá,
-- sincronizado desde afuera) — es aceptable, son dos vistas con propósitos
-- distintos, no hace falta deduplicar.
--
-- attributed_sales/roas_organic/link_clicks quedan nullable a propósito —
-- "Arquitectura del Santo Grial" (2026-08-01): la próxima fase va a cruzar
-- esto con Tiendanube/WhatsApp, pero esa integración todavía no existe.
-- Se agregan ahora mismo (acá y en tiktok_videos) para no tener que volver
-- a tocar el esquema cuando llegue esa fase — hoy siempre van a estar en
-- null, nunca se completan con datos inventados.
create table if not exists instagram_media_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  ig_media_id text not null,
  caption text,
  media_type text,
  media_url text,
  thumbnail_url text,
  permalink text,
  posted_at timestamptz,
  like_count integer,
  comments_count integer,
  impressions integer,
  reach integer,
  plays integer,
  saved integer,
  shares integer,
  attributed_sales numeric,
  roas_organic numeric,
  link_clicks integer,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, ig_media_id)
);

alter table instagram_media_catalog enable row level security;

create policy "org members read instagram media catalog"
  on instagram_media_catalog for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write instagram media catalog"
  on instagram_media_catalog for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update instagram media catalog"
  on instagram_media_catalog for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members delete instagram media catalog"
  on instagram_media_catalog for delete
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create index if not exists instagram_media_catalog_org_idx on instagram_media_catalog (organization_id);
create index if not exists instagram_media_catalog_org_plays_idx on instagram_media_catalog (organization_id, plays desc);

-- Mismas 3 columnas "Santo Grial" en tiktok_videos, mismo motivo — que las
-- dos plataformas queden con la misma forma para cuando exista el cruce
-- real con ventas, en vez de tener que volver a tocar ambos esquemas por
-- separado.
alter table tiktok_videos
  add column if not exists attributed_sales numeric,
  add column if not exists roas_organic numeric,
  add column if not exists link_clicks integer;

-- Cursor de paginación del sync "zero fricción" — a diferencia de TikTok
-- (video.list trae todo en una sola llamada por página, sin costo extra
-- por ítem), acá cada video/post necesita una llamada aparte a
-- /{media-id}/insights, así que un solo click de "Sincronizar ahora" solo
-- puede procesar un lote acotado por vez (ver syncInstagramMediaAction) sin
-- exceder el tiempo máximo de un Server Action. Sin este cursor, cada click
-- volvería a traer siempre los mismos posts más recientes y nunca llegaría
-- al resto del historial.
alter table instagram_connections
  add column if not exists media_sync_cursor text,
  add column if not exists media_sync_complete boolean not null default false;
