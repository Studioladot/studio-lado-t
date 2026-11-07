-- Purga semanal de logs e insights viejos, para que la base no crezca sin
-- control en el plan Free. Las tablas de insights no tienen created_at:
-- se purgan por captured_at (date).
create extension if not exists pg_cron;

create or replace function public.purgar_datos_viejos()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from autopilot_run_log          where created_at  < now() - interval '30 days';
  delete from launch_activity_log        where created_at  < now() - interval '60 days';
  delete from ia_chat_messages           where created_at  < now() - interval '45 days';
  delete from instagram_media_insights   where captured_at < current_date - 180;
  delete from instagram_account_insights where captured_at < current_date - 180;
end;
$$;

-- Solo la corre el cron: nadie puede dispararla vía API.
revoke execute on function public.purgar_datos_viejos() from public, anon, authenticated;

select cron.schedule('purga-semanal', '0 4 * * 0', $c$select public.purgar_datos_viejos()$c$);
