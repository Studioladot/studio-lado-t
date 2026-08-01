-- Cierre de secciones pendientes: IA Estratégica, Diario de Marca,
-- Facturación (trial a nivel organización). Ventas/Tienda Nube reusa
-- tablas legacy ya existentes (daily_sales, fin_config, etc), sin tabla
-- nueva acá.

create table ia_chat_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table ia_chat_messages enable row level security;

create policy "org members read ia chat"
  on ia_chat_messages for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write ia chat"
  on ia_chat_messages for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create index if not exists ia_chat_messages_org_created_idx on ia_chat_messages (organization_id, created_at);

-- Una entrada por mes por organización — "Generar resumen" hace upsert,
-- "Regenerar" pisa la entrada existente del mes en curso.
create table brand_journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  month date not null,
  narrative text not null,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, month)
);

alter table brand_journal_entries enable row level security;

create policy "org members read brand journal"
  on brand_journal_entries for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write brand journal"
  on brand_journal_entries for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update brand journal"
  on brand_journal_entries for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

-- Trial a nivel organización — reemplaza conceptualmente user_profiles.expires_at
-- (mal escopeado: por usuario, no por organización, para el modelo multi-tenant actual).
alter table organizations add column trial_ends_at timestamptz;
