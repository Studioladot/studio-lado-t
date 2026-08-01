-- Dashboard de Rentabilidad Neta (/operations/sales) — reemplaza
-- conceptualmente tn_product_costs (sin organization_id, incompatible con
-- el modelo multi-tenant actual). Única tabla nueva de esta ronda: el
-- resto de los módulos (embudo, gráfico diario, insights, cascada) se
-- calculan en vivo a partir de las órdenes, no necesitan persistirse.
create table product_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tn_variant_id bigint not null,
  tn_product_id bigint,
  -- Cacheado la primera vez que se resuelve contra /products de Tienda
  -- Nube — evita pedir el catálogo completo solo para mostrar el nombre.
  product_name text,
  cost numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (organization_id, tn_variant_id)
);

alter table product_costs enable row level security;

create policy "org members read product costs"
  on product_costs for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write product costs"
  on product_costs for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update product costs"
  on product_costs for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members delete product costs"
  on product_costs for delete
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));
