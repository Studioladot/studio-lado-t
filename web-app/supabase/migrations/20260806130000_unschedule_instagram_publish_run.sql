-- Decisión de producto (2026-08-05): Gotix es una herramienta de
-- planificación de contenido, no un programador de posteos — el flujo de
-- creación en Contenido/Campañas termina en "Listo para publicar", nunca en
-- un auto-publish contra la API de Meta. Se desactiva el cron que corría
-- cada 5 min contra la Edge Function instagram-publish-run (ver
-- 20260730190000_instagram_cron_schedule.sql), que ya se borró del repo.
--
-- No se toca 'instagram-metrics-sync-daily' — esa sigue trayendo estadísticas
-- reales, es un pilar activo del producto (Rendimiento/Comparativa).
select cron.unschedule('instagram-publish-run-5min');
