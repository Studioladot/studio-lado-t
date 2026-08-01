-- Cierre del audit check del módulo Meta Ads: notificaciones por email,
-- log agregado de cuenta, y el terreno para que el modo Avanzado
-- (autopilot_custom_rules, ya existía sin usarse) empiece a ejecutarse de
-- verdad desde la Edge Function.

-- ── organization_notification_settings ───────────────────────────────────
-- Una fila por organización. email/whatsapp_number nullable a propósito —
-- el usuario puede activar notificaciones sin haber cargado un canal
-- todavía (la Edge Function simplemente no envía nada hasta que haya algo
-- cargado). whatsapp_number queda listo en la tabla pero sin lógica de
-- envío en esta ronda — WhatsApp Business API es un onboarding de Meta
-- completamente aparte del Meta Ads API que ya está conectado.
create table if not exists organization_notification_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  email text,
  whatsapp_number text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table organization_notification_settings enable row level security;

create policy "org members read notification settings"
  on organization_notification_settings for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write notification settings"
  on organization_notification_settings for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update notification settings"
  on organization_notification_settings for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

-- ── autopilot_custom_rules.params ────────────────────────────────────────
-- Falta un lugar para configurar el % de cambio de presupuesto en reglas
-- con acción reduce_budget/increase_budget — mismo patrón que
-- autopilot_playbook_settings.params (jsonb libre, no una columna nueva
-- por cada acción). budgetChangePct es la única clave que usa la Edge
-- Function hoy; se puede sumar más sin otra migración.
alter table autopilot_custom_rules add column if not exists params jsonb not null default '{}'::jsonb;

-- ── autopilot_run_log.campaign_name ──────────────────────────────────────
-- El log agregado de cuenta (Rentabilidad → Actividad reciente) necesita
-- mostrar de qué campaña es cada entrada sin depender de un join contra
-- Meta en cada lectura — la Edge Function ya tiene el nombre a mano en el
-- momento de escribir el log, así que se guarda ahí (denormalizado a
-- propósito, igual que entity_name).
alter table autopilot_run_log add column if not exists campaign_name text;

create index if not exists autopilot_run_log_org_created_idx
  on autopilot_run_log (organization_id, created_at desc);
