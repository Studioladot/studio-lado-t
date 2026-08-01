-- El fetch de instagram-metrics-sync ya usaba ${item.ig_media_id}/insights
-- (métricas reales por publicación, no de cuenta) — pero instagram_media_
-- insights no guardaba ese id como columna propia, solo alcanzable
-- indirectamente vía piece_id/post_id → content_piezas/content_posts.
-- ig_media_id. Se agrega directo acá para trazabilidad auditable: cada fila
-- de métricas queda ligada de forma explícita e innegable al medio real de
-- Instagram del que vino, sin depender de un join para probarlo.
alter table instagram_media_insights
  add column if not exists ig_media_id text;

create index if not exists instagram_media_insights_ig_media_id_idx on instagram_media_insights (ig_media_id);
