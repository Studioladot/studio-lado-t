-- P1 (auditoría de cierre, 2026-07-30): antes, un token de Meta vencido o un
-- rate limit dejaba al Autopiloto apagado en silencio para toda la
-- organización — cada graphGet/graphPost fallido de la corrida se saltaba
-- con un simple `continue`, sin dejar rastro en autopilot_run_log ni
-- disparar el email resumen. 'error' es el nuevo valor de acción que usa la
-- Edge Function (autopilot-run/index.ts) para dejar una entrada visible en
-- "Actividad reciente" y alertar al usuario cuando esto pasa.
alter table autopilot_run_log drop constraint autopilot_run_log_action_check;
alter table autopilot_run_log add constraint autopilot_run_log_action_check
  check (action in ('pause', 'reduce_budget', 'increase_budget', 'notify', 'rotate_creative', 'error'));
