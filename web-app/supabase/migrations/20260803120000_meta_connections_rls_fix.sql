-- Fix (bloque de corrección, 2026-08-03): el callback de Meta rebotaba con
-- meta_error al hacer el INSERT en meta_connections. Investigación de
-- código descartó la hipótesis original ("no inyecta bien organization_id")
-- — activeOrganizationId se resuelve y valida ANTES de llegar al INSERT
-- (src/app/api/meta/callback/route.ts:52-56), nunca puede ser null ahí.
--
-- meta_connections no tiene ninguna migración propia en este repo (mismo
-- caso que organization_members — ver auditoría de seguridad, "~45 tablas
-- sin migración", y la migración 20260802120000 que ya resolvió el mismo
-- problema para esa tabla). Sin el archivo que la creó, no se puede saber
-- qué política de RLS tiene hoy en la base real — la hipótesis mejor
-- sustentada por el código (mismo patrón que meta_connections ya replica en
-- comentarios de otras migraciones, ver 20260724125608_autopilot_org_scoped.sql:5-7)
-- es que esa política está corrida, ausente, o no coincide con
-- organization_members. Este bloque no asume el nombre de un constraint
-- previo (a diferencia de organization_members, acá se puede recrear
-- directo con DROP POLICY IF EXISTS, que no falla si la política no existe
-- o se llama distinto).
alter table meta_connections enable row level security;

drop policy if exists "org members read meta_connections" on meta_connections;
drop policy if exists "org members write meta_connections" on meta_connections;
drop policy if exists "org members select meta_connections" on meta_connections;
drop policy if exists "org members insert meta_connections" on meta_connections;
drop policy if exists "org members update meta_connections" on meta_connections;
drop policy if exists "org members delete meta_connections" on meta_connections;

create policy "org members select meta_connections"
  on meta_connections for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members insert meta_connections"
  on meta_connections for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update meta_connections"
  on meta_connections for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()))
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members delete meta_connections"
  on meta_connections for delete
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));
