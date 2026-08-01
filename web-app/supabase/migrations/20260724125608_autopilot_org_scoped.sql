-- Autopiloto real, organization_id-scoped (reemplaza el diseño legado
-- user_id-scoped de autopilot_rules/autopilot_log/ad_targets, que quedan
-- huérfanas — ningún código de web-app las referencia, no se tocan acá).
--
-- Mismo criterio de acceso que meta_connections: cualquier miembro de la
-- organización (organization_members) puede leer/escribir, sin distinción
-- de rol — igual de permisivo que el resto de las tablas org-scoped hoy.

-- ── autopilot_playbook_settings ──────────────────────────────────────────
-- El corazón de "prender un playbook por campaña". Un playbook por
-- (organización, campaña, tipo) — enabled=false por default: nada corre
-- hasta que el usuario lo prenda a propósito.
create table if not exists autopilot_playbook_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id text not null,
  playbook_type text not null check (playbook_type in ('scale_budget', 'stop_loss', 'anti_fatigue')),
  enabled boolean not null default false,
  params jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (organization_id, campaign_id, playbook_type)
);

alter table autopilot_playbook_settings enable row level security;

create policy "org members read playbook settings"
  on autopilot_playbook_settings for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write playbook settings"
  on autopilot_playbook_settings for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update playbook settings"
  on autopilot_playbook_settings for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members delete playbook settings"
  on autopilot_playbook_settings for delete
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

-- ── autopilot_custom_rules ───────────────────────────────────────────────
-- Modo avanzado (progressive disclosure) para el usuario power que se queda
-- corto con los playbooks preseteados. campaign_id null = aplica a toda la
-- cuenta conectada.
create table if not exists autopilot_custom_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id text,
  name text not null,
  conditions jsonb not null default '[]'::jsonb,
  window_days integer not null default 7,
  min_spend numeric not null default 0,
  action text not null check (action in ('pause', 'reduce_budget', 'increase_budget', 'notify')),
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table autopilot_custom_rules enable row level security;

create policy "org members read custom rules"
  on autopilot_custom_rules for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write custom rules"
  on autopilot_custom_rules for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update custom rules"
  on autopilot_custom_rules for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members delete custom rules"
  on autopilot_custom_rules for delete
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

-- ── autopilot_run_log ────────────────────────────────────────────────────
-- Reemplaza autopilot_log. Una fila por acción tomada (por un playbook o
-- por una regla custom) — leído por el panel lateral ("Actividad reciente")
-- y por la Edge Function para el freno "no repetir la misma acción sobre
-- la misma entidad más de una vez por día".
create table if not exists autopilot_run_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id text not null,
  entity_type text not null check (entity_type in ('campaign', 'adset', 'ad')),
  entity_id text not null,
  entity_name text,
  playbook_type text,
  rule_id uuid references autopilot_custom_rules(id) on delete set null,
  action text not null check (action in ('pause', 'reduce_budget', 'increase_budget', 'notify')),
  message text not null,
  created_at timestamptz not null default now()
);

alter table autopilot_run_log enable row level security;

create policy "org members read run log"
  on autopilot_run_log for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

-- Solo la Edge Function (service role, que bypassea RLS) inserta acá — no
-- se agrega policy de insert para usuarios autenticados a propósito.

create index if not exists autopilot_run_log_org_campaign_idx
  on autopilot_run_log (organization_id, campaign_id, created_at desc);

-- ── campaign_targets ─────────────────────────────────────────────────────
-- Reemplaza ad_targets. campaign_id null = default de cuenta; una fila con
-- campaign_id no-null es el override específico de esa campaña (el legado
-- nunca persistía esto, vivía solo en localStorage).
--
-- Dos niveles de CPA/ROAS, no uno — target_* es el "objetivo" (cumple el
-- margen de ganancia deseado), breakeven_* es el límite antes de perder
-- plata. Son valores distintos a propósito (ver calculadora de Unit
-- Economics): CPA objetivo < CPA breakeven siempre que el margen deseado
-- sea > 0. unit_economics guarda los inputs crudos de la calculadora
-- (ticket promedio, % costo producto, % pasarela, % impuestos, % margen
-- deseado) solo para poder reabrir el modal ya precargado — el cálculo en
-- sí vive en el cliente (src/lib/meta/autopilot.ts), esta columna no es la
-- fuente de verdad de target_*/breakeven_*, es una conveniencia de UI.
create table if not exists campaign_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id text,
  target_cpa numeric,
  target_roas numeric,
  breakeven_cpa numeric,
  breakeven_roas numeric,
  unit_economics jsonb,
  updated_at timestamptz not null default now(),
  unique (organization_id, campaign_id)
);

alter table campaign_targets enable row level security;

create policy "org members read campaign targets"
  on campaign_targets for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write campaign targets"
  on campaign_targets for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update campaign targets"
  on campaign_targets for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members delete campaign targets"
  on campaign_targets for delete
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

-- ── pg_cron + pg_net: corrida autónoma cada hora ─────────────────────────
-- Requiere que ambas extensiones estén habilitadas (Database → Extensions
-- en el dashboard de Supabase) y un secreto 'service_role_key' cargado en
-- Vault (Database → Vault) ANTES de correr esta migración — ver instrucciones
-- exactas al final del plan/PR. No se hardcodea la key acá.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'autopilot-run-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://vluoynizpvckjqomojxx.supabase.co/functions/v1/autopilot-run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
