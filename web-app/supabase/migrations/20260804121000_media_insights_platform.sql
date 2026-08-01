-- instagram_media_insights ya es "post_analytics" (polimórfica piece_id/
-- post_id, guarda plays/likes/comments/reach/saves/shares por captured_at)
-- — crear una tabla post_analytics nueva fragmentaría el dato y obligaría a
-- reescribir performance-tab.tsx/comparison-panel.tsx para leer de dos
-- lados. Se agrega platform acá en vez de eso: cuando exista la Fase 2,
-- tiktok-metrics-sync escribe filas con platform='tiktok' en esta misma
-- tabla, reusando `plays` como métrica universal de reproducciones (TikTok
-- también las llama "views" — mismo concepto, no hace falta una columna
-- nueva). El nombre de la tabla se deja como está a propósito — renombrarla
-- tocaría RLS, índices, el edge function y cada referencia de UI para cero
-- beneficio funcional.
alter table instagram_media_insights
  add column if not exists platform text not null default 'instagram'
    check (platform in ('instagram', 'tiktok'));

create index if not exists instagram_media_insights_platform_idx on instagram_media_insights (platform);
