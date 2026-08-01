-- Cron real para instagram-publish-run / instagram-metrics-sync — mismo
-- patrón que 'autopilot-run-hourly' en 20260724125608_autopilot_org_scoped.sql
-- (pg_cron + pg_net + el secreto 'service_role_key' ya cargado en Vault).
--
-- IMPORTANTE: correr esta migración recién DESPUÉS de deployar las dos
-- Edge Functions (`supabase functions deploy instagram-publish-run` y
-- `supabase functions deploy instagram-metrics-sync`) — apuntar cron a una
-- función que todavía no existe falla en cada corrida sin avisar a nadie.
--
-- instagram-publish-run corre cada 5 minutos (no cada hora, como el
-- autopiloto) — "programado a las 18:30" con una hora de margen no sirve.
-- instagram-metrics-sync corre una vez al día, analítica no necesita
-- frecuencia mayor y ahorra rate limit de la Insights API.

select cron.schedule(
  'instagram-publish-run-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://vluoynizpvckjqomojxx.supabase.co/functions/v1/instagram-publish-run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'instagram-metrics-sync-daily',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://vluoynizpvckjqomojxx.supabase.co/functions/v1/instagram-metrics-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
