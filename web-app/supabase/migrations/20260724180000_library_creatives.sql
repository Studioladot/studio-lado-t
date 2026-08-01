-- Biblioteca de Ads real: banco de creativos org-scoped listos para lanzar,
-- y la pieza que le faltaba al playbook Anti-Fatiga para rotar creativo de
-- verdad en vez de solo avisar (antes no había de dónde sacar un reemplazo).

create table library_creatives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  asset_type text not null check (asset_type in ('image', 'video')),
  file_url text not null,
  primary_text text,
  headline text,
  cta text not null default 'LEARN_MORE',
  -- active = disponible para rotar; in_use = desplegado ahora mismo en un
  -- anuncio real (deployed_ad_id/deployed_at lo trazan); paused = fuera del
  -- pool, el usuario lo sacó de circulación a mano.
  status text not null default 'active' check (status in ('active', 'in_use', 'paused')),
  -- Cacheados la primera vez que este activo se sube a Meta — evita
  -- resubir los mismos bytes (y re-esperar el procesamiento de un video) en
  -- cada rotación futura del mismo creativo.
  meta_image_hash text,
  meta_video_id text,
  deployed_ad_id text,
  deployed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table library_creatives enable row level security;

create policy "org members read library creatives"
  on library_creatives for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write library creatives"
  on library_creatives for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members update library creatives"
  on library_creatives for update
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members delete library creatives"
  on library_creatives for delete
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create index if not exists library_creatives_org_status_idx
  on library_creatives (organization_id, status, created_at);

-- El check de autopilot_run_log.action no contemplaba "rotar" — Anti-Fatiga
-- ahora puede desplegar un anuncio nuevo de verdad, no solo notificar.
alter table autopilot_run_log drop constraint autopilot_run_log_action_check;
alter table autopilot_run_log add constraint autopilot_run_log_action_check
  check (action in ('pause', 'reduce_budget', 'increase_budget', 'notify', 'rotate_creative'));
