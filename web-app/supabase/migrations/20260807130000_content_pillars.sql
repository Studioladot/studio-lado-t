-- "Pilares de Contenido" (2026-08-07) — capa estratégica sobre Publicaciones
-- (content_posts): qué rol cumple cada pieza en el embudo (Atracción/
-- Nutrición/Venta por defecto), editable por organización desde el modal de
-- gestión (ver pillar-field.tsx). Lista dinámica por org → tabla dedicada
-- con sort_order, mismo patrón que el resto del repo usa para este tipo de
-- configuración (ver ad_creative_origins, metric_benchmarks) en vez de un
-- jsonb libre compartido.
--
-- Sin seed automático acá: getContentPillars (lib/content/pillars.ts) siembra
-- los 3 default ("Atracción"/"Nutrición"/"Venta") la primera vez que una
-- organización sin filas propias pide su lista — cubre tanto las cuentas
-- existentes como cualquier cuenta nueva, sin depender de un trigger sobre
-- la creación de `organizations` (que no vive en este repo).
create table if not exists content_pillars (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table content_pillars enable row level security;

create policy "org members read content pillars"
  on content_pillars for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write content pillars"
  on content_pillars for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update content pillars"
  on content_pillars for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members delete content pillars"
  on content_pillars for delete
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create index if not exists content_pillars_org_idx on content_pillars (organization_id, sort_order);

-- Publicaciones — a qué pilar estratégico pertenece esta pieza. Texto libre
-- (no FK a content_pillars.id) a propósito: mismo criterio que status/turno/
-- platform/format en esta misma tabla — si el usuario borra o renombra un
-- pilar más adelante desde el modal, las publicaciones viejas no se rompen
-- ni pierden el dato, solo dejan de matchear con una opción activa del
-- selector (se re-inyectan como opción extra, ver pillar-field.tsx).
alter table content_posts add column if not exists pillar text;
