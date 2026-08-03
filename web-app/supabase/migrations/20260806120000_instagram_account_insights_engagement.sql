-- Analítica Avanzada B2B — Nivel 1 (Visión Global de la Cuenta), 2026-08-06.
--
-- instagram_account_insights solo traía follower_count/reach/impressions.
-- Para las tarjetas "Interacciones Totales" y "Tasa de Engagement global" del
-- nuevo panel hace falta el total de interacciones orgánicas a nivel cuenta
-- (likes+comments+shares+saves agregado, no por publicación) — Meta expone
-- esto como la métrica real `total_interactions` en /{ig-user-id}/insights
-- desde Graph API v19+. Se suma también `profile_views` (visitas al perfil),
-- útil como métrica de contexto aunque no forme parte de los 4 KPI pedidos.
--
-- Ambas nullable, mismo criterio que las columnas existentes: si Meta no
-- devuelve el dato para una cuenta (umbral de audiencia, cuenta chica, etc.)
-- queda NULL, nunca se completa con 0.
alter table public.instagram_account_insights
  add column if not exists profile_views numeric,
  add column if not exists total_interactions numeric;
