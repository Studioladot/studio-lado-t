-- Fase 3.1: publicaciones sueltas ganan el mismo scheduling que las piezas
-- de campaña, e instagram_media_insights pasa a ser polimórfico (pieza O
-- publicación suelta) para poder guardar métricas de ambas y habilitar la
-- Comparativa.

-- ── content_posts: mismas 7 columnas que ya tiene content_piezas ─────────
-- caption ya existe (columna nativa del legado) — no se toca acá.
alter table content_posts
  add column if not exists scheduled_at timestamptz,
  add column if not exists publish_status text not null default 'none'
    check (publish_status in ('none', 'scheduled', 'publishing', 'published', 'failed')),
  add column if not exists ig_container_id text,
  add column if not exists ig_media_id text,
  add column if not exists ig_permalink text,
  add column if not exists publish_error text,
  add column if not exists retry_count integer not null default 0;

create index if not exists content_posts_scheduled_pending_idx
  on content_posts (scheduled_at)
  where publish_status = 'scheduled';

-- ── instagram_media_insights: polimórfico (pieza O publicación suelta) ───
-- piece_id deja de ser obligatorio; post_id es la contraparte para
-- content_posts. El check garantiza que cada fila venga de exactamente una
-- fuente — nunca ambas, nunca ninguna.
alter table instagram_media_insights
  alter column piece_id drop not null,
  add column if not exists post_id uuid references content_posts(id) on delete cascade,
  add constraint media_insights_exactly_one_source
    check ((piece_id is not null)::int + (post_id is not null)::int = 1);

-- El unique(piece_id, captured_at) original ya no alcanza (piece_id ahora
-- puede ser null) — se reemplaza por dos índices únicos parciales, uno por
-- fuente. Es el patrón estándar de Postgres para FKs polimórficas nullable.
drop index if exists instagram_media_insights_piece_id_captured_at_key;
alter table instagram_media_insights drop constraint if exists instagram_media_insights_piece_id_captured_at_key;

create unique index if not exists media_insights_piece_captured_idx
  on instagram_media_insights (piece_id, captured_at)
  where piece_id is not null;

create unique index if not exists media_insights_post_captured_idx
  on instagram_media_insights (post_id, captured_at)
  where post_id is not null;

create index if not exists instagram_media_insights_post_idx on instagram_media_insights (post_id);
