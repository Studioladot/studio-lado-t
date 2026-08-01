-- Historial (log de intentos de lanzamiento del wizard) y Tablas de
-- Métricas (targets personalizados de benchmarks) — cierran los últimos
-- placeholders del roadmap de Meta Ads. Ver research de app.html en el
-- plan: ninguna de las dos es lo que el nombre sugiere a primera vista.

create table launch_activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id text,
  campaign_name text not null,
  status text not null check (status in ('completed', 'completed_with_errors', 'failed')),
  steps jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table launch_activity_log enable row level security;

create policy "org members read launch activity log"
  on launch_activity_log for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write launch activity log"
  on launch_activity_log for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create index if not exists launch_activity_log_org_created_idx
  on launch_activity_log (organization_id, created_at desc);

-- Una fila por organización, igual que el default de cuenta de
-- campaign_targets (campaign_id null) — todos los campos numeric y
-- nullable, vacío = el usuario todavía no cargó ese target.
create table metric_benchmarks (
  organization_id uuid primary key references organizations(id) on delete cascade,
  hook_rate_target numeric,
  ctr_target numeric,
  roas_min numeric,
  roas_target numeric,
  cpa_max numeric,
  cpm_max numeric,
  freq_max numeric,
  p25_target numeric,
  p100_target numeric,
  updated_at timestamptz not null default now()
);

alter table metric_benchmarks enable row level security;

create policy "org members read metric benchmarks"
  on metric_benchmarks for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write metric benchmarks"
  on metric_benchmarks for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update metric benchmarks"
  on metric_benchmarks for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));
