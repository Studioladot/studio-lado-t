-- "Pilares Estratégicos" — expansión transversal (2026-08-07). content_pillars
-- (creada en 20260807130000_content_pillars.sql) ya es la fuente única de
-- verdad de la LISTA de pilares por organización; esta migración solo agrega
-- dónde se guarda la ASIGNACIÓN de un pilar en dos superficies nuevas:
-- Campañas de Meta Ads y Notas. Texto libre en ambas (no FK a
-- content_pillars.id) — mismo criterio ya usado en content_posts.pillar:
-- renombrar/borrar un pilar desde el modal de gestión nunca rompe una
-- asignación histórica, solo deja de aparecer como opción activa.

-- Campañas de Meta Ads viven solo en Meta (identificadas por su ID de
-- campaña, texto), no hay una fila local por campaña — mismo patrón ya
-- usado por campaign_targets/ad_creative_origins para atar configuración
-- local a un campaign_id de Meta.
create table if not exists campaign_pillars (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id text not null,
  pillar text not null,
  updated_at timestamptz not null default now(),
  unique (organization_id, campaign_id)
);

alter table campaign_pillars enable row level security;

create policy "org members read campaign pillars"
  on campaign_pillars for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write campaign pillars"
  on campaign_pillars for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update campaign pillars"
  on campaign_pillars for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members delete campaign pillars"
  on campaign_pillars for delete
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create index if not exists campaign_pillars_org_campaign_idx on campaign_pillars (organization_id, campaign_id);

-- Notas — nombre de columna en español (`pilar`), a diferencia de
-- content_posts.pillar: esta tabla ya es 100% española (titulo/contenido/
-- categoria), mezclar una columna en inglés ahí desentonaría con el resto
-- del esquema. El VALOR guardado es el mismo nombre de content_pillars —
-- el idioma de la columna es solo una convención local por tabla.
alter table notes add column if not exists pilar text;
