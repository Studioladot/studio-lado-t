-- Épica Omnicanal (2026-08-04) — Contenido pasa de "calendario + publicador
-- de Instagram" a hub de producción multi-red. Ver el plan completo en la
-- conversación para el razonamiento; resumen de las decisiones que importan
-- para leer este archivo:
--
-- 1. production_status es NUEVO y NO reemplaza `status` — `status` ya existe
--    ('pendiente'/'borrador'/'publicado') y control-panel.tsx calcula las
--    rachas con `status === 'publicado'` (comparación de string exacta).
--    Pisarlo con los 5 estados del pipeline de producción rompería las
--    rachas en silencio. production_status es el estado de PRODUCCIÓN
--    (Idea → Grabación → Edición → Publicación); `status` sigue siendo el
--    flag legacy que ya usan las rachas; `publish_status`/`tiktok_publish_status`
--    siguen siendo la mecánica de auto-publicación de cada red. Tres campos,
--    tres preguntas distintas, a propósito.
-- 2. reference_urls es NUEVO (Referencias — moodboard/tomas crudas,
--    multi-archivo). media_urls/media_url/media_type NO se tocan — son las
--    columnas que instagram-publish-run ya lee para armar el contenedor de
--    Meta, pasan a ser conceptualmente el "Archivo Final" (un solo archivo).
-- 3. Las columnas de Instagram (caption, scheduled_at, publish_status,
--    ig_container_id, ig_media_id, ig_permalink, publish_error, retry_count,
--    published_at) NO se renombran a ig_* — instagram-publish-run ya está en
--    producción leyéndolas tal cual. TikTok gana un set paralelo completo
--    prefijado tiktok_, mismo shape, para que la Fase 2 (Edge Function real
--    de TikTok) sea un mirror directo sin inventar un modelo de datos nuevo.

alter table content_posts
  add column if not exists production_status text not null default 'idea'
    check (production_status in ('idea', 'por_grabar', 'listo_para_programar', 'programado', 'publicado')),
  add column if not exists reference_urls jsonb not null default '[]'::jsonb,
  add column if not exists tiktok_caption text,
  add column if not exists tiktok_scheduled_at timestamptz,
  add column if not exists tiktok_publish_status text not null default 'none'
    check (tiktok_publish_status in ('none', 'scheduled', 'publishing', 'published', 'failed')),
  add column if not exists tiktok_container_id text,
  add column if not exists tiktok_media_id text,
  add column if not exists tiktok_permalink text,
  add column if not exists tiktok_publish_error text,
  add column if not exists tiktok_retry_count integer not null default 0,
  add column if not exists tiktok_published_at timestamptz;

alter table content_piezas
  add column if not exists production_status text not null default 'idea'
    check (production_status in ('idea', 'por_grabar', 'listo_para_programar', 'programado', 'publicado')),
  add column if not exists reference_urls jsonb not null default '[]'::jsonb,
  add column if not exists tiktok_caption text,
  add column if not exists tiktok_scheduled_at timestamptz,
  add column if not exists tiktok_publish_status text not null default 'none'
    check (tiktok_publish_status in ('none', 'scheduled', 'publishing', 'published', 'failed')),
  add column if not exists tiktok_container_id text,
  add column if not exists tiktok_media_id text,
  add column if not exists tiktok_permalink text,
  add column if not exists tiktok_publish_error text,
  add column if not exists tiktok_retry_count integer not null default 0,
  add column if not exists tiktok_published_at timestamptz;

-- Mismo índice parcial que ya existe para scheduled_at/publish_status de
-- Instagram (content_posts_scheduled_pending_idx / content_piezas_...) —
-- réplica para el lado TikTok, la Fase 2 lo va a necesitar para el mismo
-- query de "vencidos y pendientes" que ya hace instagram-publish-run.
create index if not exists content_posts_tiktok_scheduled_pending_idx
  on content_posts (tiktok_scheduled_at) where tiktok_publish_status = 'scheduled';
create index if not exists content_piezas_tiktok_scheduled_pending_idx
  on content_piezas (tiktok_scheduled_at) where tiktok_publish_status = 'scheduled';
