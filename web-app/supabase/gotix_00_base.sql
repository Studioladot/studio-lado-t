-- ============================================================================
-- GOTIX — Schema base para proyecto Supabase nuevo (plan Free)
-- ============================================================================
-- Reconstruido desde src/lib/types/database.types.ts del repo studio-lado-t.
-- Contiene SOLO las 14 tablas base que se crearon a mano en el dashboard viejo
-- y que por eso no están en supabase/migrations/.
--
-- Omitido a propósito para que las migraciones no choquen:
--   organizations.trial_ends_at      (lo agrega 20260725160000)
--   notes.campaign_id                (lo agrega 20260806140000)
--   organization_members role check   (lo agrega 20260802120000)
--
-- Omitido a propósito porque GOTIX deja de ser SaaS:
--   billing_events, metric_benchmarks, support_tickets, spend_alerts,
--   user_alert_settings, y todas las tablas legado del app.html.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. ORGANIZACIONES  (1 organización = 1 cliente de agencia)
-- ============================================================================

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  plan        text not null default 'free',
  created_at  timestamptz default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'member',
  primary key (organization_id, user_id)
);

create index if not exists idx_org_members_user on public.organization_members(user_id);

create table if not exists public.organization_usage (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  metric_name     text not null,
  count           integer default 0,
  window_start    timestamptz,
  created_at      timestamptz default now()
);

create index if not exists idx_org_usage_lookup
  on public.organization_usage(organization_id, metric_name, window_start);

-- ============================================================================
-- 2. PERFILES DE USUARIO
-- ============================================================================

create table if not exists public.user_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  nombre       text,
  negocio      text,
  whatsapp     text,
  notas        text,
  is_admin     boolean default false,
  is_approved  boolean default true,
  permissions  jsonb,
  expires_at   timestamptz,
  created_at   timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, is_approved)
  values (new.id, new.email, true)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 3. CONEXIONES A PLATAFORMAS
-- ============================================================================

create table if not exists public.meta_connections (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  organization_id  uuid references public.organizations(id) on delete cascade,
  account_id       text not null,
  account_name     text,
  account_currency text,
  app_id           text,
  fb_user_id       text,
  token            text not null,
  expires_at       timestamptz,
  created_at       timestamptz default now()
);

create index if not exists idx_meta_conn_org on public.meta_connections(organization_id);

create table if not exists public.tiendanube_connections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  store_id        text not null,
  store_name      text,
  store_url       text,
  access_token    text not null,
  connected_at    timestamptz default now()
);

create index if not exists idx_tn_conn_org on public.tiendanube_connections(organization_id);

-- ============================================================================
-- 4. PERFIL DE NEGOCIO Y CONFIGURACIÓN FINANCIERA
-- ============================================================================

create table if not exists public.business_profile (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  organization_id        uuid references public.organizations(id) on delete cascade,
  brand_name             text,
  rubro                  text,
  ubicacion              text,
  tono                   text,
  breakeven_roas         numeric,
  margen_bruto_objetivo  numeric,
  experto1_nombre        text,
  experto1_rol           text,
  experto2_nombre        text,
  experto2_rol           text,
  notas_libres           text,
  updated_at             timestamptz default now()
);

create table if not exists public.fin_config (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  organization_id           uuid references public.organizations(id) on delete cascade,
  margen_bruto              numeric,
  comision_tn_pct           numeric,
  costo_envio_promedio      numeric,
  costos_adicionales_manual numeric,
  objetivo_ganancia_pct     numeric,
  presupuesto_ads_mensual   numeric,
  dias_operativos           integer,
  meta_moneda               text,
  usd_manual                numeric
);

create index if not exists idx_fin_config_org on public.fin_config(organization_id);

-- ============================================================================
-- 5. VENTAS AGREGADAS
-- ============================================================================

create table if not exists public.daily_sales (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  fecha           date not null default current_date,
  canal           text,
  monto           numeric,
  unidades        integer,
  costo_unitario  numeric,
  tn_product_id   text,
  tn_variant_id   text,
  notas           text,
  created_at      timestamptz default now()
);

create index if not exists idx_daily_sales_org_fecha
  on public.daily_sales(organization_id, fecha desc);

-- ============================================================================
-- 6. NOTAS Y GUIONES
-- ============================================================================

create table if not exists public.notes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  titulo          text,
  contenido       text not null,
  categoria       text,
  color           text,
  media_url       text,
  pilar           text,
  created_at      timestamptz default now()
);

create index if not exists idx_notes_org on public.notes(organization_id, created_at desc);

-- scripts.id es text (no uuid) como en la base vieja: la migración
-- 20260725140000_library_script_link le cuelga una FK de tipo text.
create table if not exists public.scripts (
  id              text primary key default gen_random_uuid()::text,
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  title           text,
  hook            text,
  body            text,
  cta             text,
  copy_feed       text,
  angle           text,
  product         text,
  status          text,
  notes           text,
  data            jsonb not null default '{}'::jsonb,
  parent_guion_id text references public.scripts(id) on delete set null,
  spend           numeric,
  roas            numeric,
  cpa             numeric,
  hook_rate       numeric,
  p25             numeric,
  p75             numeric,
  p100            numeric,
  updated_at      timestamptz default now()
);

create index if not exists idx_scripts_org on public.scripts(organization_id);

-- ============================================================================
-- 7. CONTENIDO
-- ============================================================================

create table if not exists public.content_campaigns (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  organization_id       uuid references public.organizations(id) on delete cascade,
  nombre                text not null,
  objetivo              text,
  concepto_estrategico  text,
  concepto_creativo     text,
  desarrollo            text,
  periodo               text,
  fecha_inicio          date,
  fecha_fin             date,
  formatos              jsonb,
  color                 text,
  status                text,
  notas                 text,
  created_at            timestamptz default now()
);

create index if not exists idx_content_campaigns_org on public.content_campaigns(organization_id);

create table if not exists public.content_piezas (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  organization_id        uuid references public.organizations(id) on delete cascade,
  campaign_id            uuid not null references public.content_campaigns(id) on delete cascade,
  titulo                 text not null,
  caption                text,
  formato                text,
  plataforma             text,
  media_type             text,
  media_url              text,
  media_urls             jsonb,
  reference_urls         jsonb not null default '[]'::jsonb,
  protagonista           text,
  turno                  text,
  notas                  text,
  status                 text,
  production_status      text not null default 'idea',
  fecha_planificada      date,
  scheduled_at           timestamptz,
  publish_status         text not null default 'none',
  published_at           timestamptz,
  publish_error          text,
  retry_count            integer not null default 0,
  ig_container_id        text,
  ig_media_id            text,
  ig_permalink           text,
  tiktok_caption         text,
  tiktok_container_id    text,
  tiktok_media_id        text,
  tiktok_permalink       text,
  tiktok_publish_status  text not null default 'none',
  tiktok_published_at    timestamptz,
  tiktok_publish_error   text,
  tiktok_retry_count     integer not null default 0,
  tiktok_scheduled_at    timestamptz,
  created_at             timestamptz default now()
);

create index if not exists idx_content_piezas_campaign on public.content_piezas(campaign_id);
create index if not exists idx_content_piezas_org on public.content_piezas(organization_id);

create table if not exists public.content_posts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references auth.users(id) on delete cascade,
  organization_id        uuid references public.organizations(id) on delete cascade,
  title                  text,
  caption                text,
  format                 text,
  platform               text,
  media_type             text,
  media_url              text,
  media_urls             jsonb,
  reference_urls         jsonb not null default '[]'::jsonb,
  pillar                 text,
  protagonista           text,
  turno                  text,
  notes                  text,
  status                 text,
  production_status      text not null default 'idea',
  date                   date,
  scheduled_at           timestamptz,
  publish_status         text not null default 'none',
  published_at           timestamptz,
  publish_error          text,
  retry_count            integer not null default 0,
  ig_container_id        text,
  ig_media_id            text,
  ig_permalink           text,
  tiktok_caption         text,
  tiktok_container_id    text,
  tiktok_media_id        text,
  tiktok_permalink       text,
  tiktok_publish_status  text not null default 'none',
  tiktok_published_at    timestamptz,
  tiktok_publish_error   text,
  tiktok_retry_count     integer not null default 0,
  tiktok_scheduled_at    timestamptz,
  created_at             timestamptz default now()
);

create index if not exists idx_content_posts_org on public.content_posts(organization_id, date);

-- ============================================================================
-- 8. FUNCIONES RPC
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.user_profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org
      and user_id = auth.uid()
      and role in ('owner','admin')
  );
$$;

create or replace function public.create_organization_with_owner(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  insert into public.organizations (name) values (org_name) returning id into new_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org, auth.uid(), 'owner');

  return new_org;
end;
$$;

create or replace function public.get_organization_members(org_id uuid)
returns table (user_id uuid, email text, role text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(org_id) then
    raise exception 'Sin acceso a esta organización';
  end if;

  return query
    select m.user_id, u.email::text, m.role
    from public.organization_members m
    join auth.users u on u.id = m.user_id
    where m.organization_id = org_id
    order by m.role, u.email;
end;
$$;

create or replace function public.invite_member_by_email(
  org_id uuid,
  member_email text,
  member_role text default 'member'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  if not public.is_org_admin(org_id) then
    return json_build_object('ok', false, 'error', 'Solo un owner o admin puede invitar');
  end if;

  select id into target from auth.users where lower(email) = lower(member_email);

  if target is null then
    return json_build_object('ok', false, 'error', 'Ese mail todavía no tiene cuenta. Que se registre primero.');
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, target, member_role)
  on conflict (organization_id, user_id) do update set role = excluded.role;

  return json_build_object('ok', true, 'user_id', target);
end;
$$;

create or replace function public.update_member_role(
  org_id uuid,
  target_user_id uuid,
  new_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_admin(org_id) then
    return jsonb_build_object('ok', false, 'error', 'Solo un owner o admin puede cambiar roles');
  end if;

  update public.organization_members
  set role = new_role
  where organization_id = org_id and user_id = target_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Ese usuario no es miembro');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.remove_member(org_id uuid, target_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_admin(org_id) then
    return json_build_object('ok', false, 'error', 'Solo un owner o admin puede quitar miembros');
  end if;

  if target_user_id = auth.uid() then
    return json_build_object('ok', false, 'error', 'No podés quitarte a vos mismo');
  end if;

  delete from public.organization_members
  where organization_id = org_id and user_id = target_user_id;

  return json_build_object('ok', true);
end;
$$;

-- ============================================================================
-- 9. RLS
-- ============================================================================

alter table public.organizations            enable row level security;
alter table public.organization_members     enable row level security;
alter table public.organization_usage       enable row level security;
alter table public.user_profiles            enable row level security;
alter table public.meta_connections         enable row level security;
alter table public.tiendanube_connections   enable row level security;
alter table public.business_profile         enable row level security;
alter table public.fin_config               enable row level security;
alter table public.daily_sales              enable row level security;
alter table public.notes                    enable row level security;
alter table public.scripts                  enable row level security;
alter table public.content_campaigns        enable row level security;
alter table public.content_piezas           enable row level security;
alter table public.content_posts            enable row level security;

drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations
  for select using (public.is_org_member(id));

drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations
  for update using (public.is_org_admin(id));

drop policy if exists org_members_select on public.organization_members;
create policy org_members_select on public.organization_members
  for select using (user_id = auth.uid() or public.is_org_member(organization_id));

drop policy if exists org_members_write on public.organization_members;
create policy org_members_write on public.organization_members
  for all using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists profile_self on public.user_profiles;
create policy profile_self on public.user_profiles
  for all using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'organization_usage','meta_connections','tiendanube_connections',
      'business_profile','fin_config','daily_sales','notes','scripts',
      'content_campaigns','content_piezas','content_posts'
    ])
  loop
    execute format('drop policy if exists org_scoped on public.%I', t);
    execute format($f$
      create policy org_scoped on public.%I
        for all
        using (organization_id is not null and public.is_org_member(organization_id))
        with check (organization_id is not null and public.is_org_member(organization_id))
    $f$, t);
  end loop;
end;
$$;

-- ============================================================================
-- 10. STORAGE
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('piezas-media', 'piezas-media', true, 52428800)
on conflict (id) do nothing;

drop policy if exists piezas_read on storage.objects;
create policy piezas_read on storage.objects
  for select using (bucket_id = 'piezas-media');

drop policy if exists piezas_write on storage.objects;
create policy piezas_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'piezas-media');

drop policy if exists piezas_delete on storage.objects;
create policy piezas_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'piezas-media');
