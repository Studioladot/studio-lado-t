-- Costos Operativos Fijos (OpEx) — reemplaza conceptualmente an_costos_adicionales
-- (user_id-scoped, incompatible con el modelo multi-tenant actual, nunca migrada).
-- Lista libre de ítems (Alquiler, Sueldos, Suscripciones, etc.) cuya suma se
-- prorratea por período y se resta en la Cascada de Rentabilidad y en la
-- Radiografía de la Orden — sin esto "Resultado Neto Real" no es real.
create table operating_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  concepto text not null,
  monto numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table operating_costs enable row level security;

create policy "org members read operating costs"
  on operating_costs for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write operating costs"
  on operating_costs for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update operating costs"
  on operating_costs for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members delete operating costs"
  on operating_costs for delete
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create index if not exists operating_costs_org_idx on operating_costs (organization_id);
