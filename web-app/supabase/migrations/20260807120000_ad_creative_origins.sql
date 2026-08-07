-- "Ranking de Ganadores Cross-Cuenta" (2026-08-07, Innovación Radical #4) —
-- registra de qué publicación orgánica de Instagram nació un anuncio creado
-- vía "Publicitar un posteo" (ver createSingleAd, modo 'instagram_post').
-- Meta no devuelve source_instagram_media_id de vuelta en una lectura
-- simple del anuncio, así que este es el único lugar donde ese vínculo
-- queda guardado — sin esto, no hay forma de saber más tarde que un
-- anuncio ganador vino de un posteo orgánico y avisarle a Contenido.
-- ad_id es el ID de Meta (texto), no una FK local — los anuncios viven
-- solo en Meta, igual que instagram_media_catalog.ig_media_id.
create table if not exists ad_creative_origins (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  ad_id text not null,
  ig_media_id text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, ad_id)
);

alter table ad_creative_origins enable row level security;

create policy "org members read ad creative origins"
  on ad_creative_origins for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create policy "org members write ad creative origins"
  on ad_creative_origins for insert
  with check (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create index if not exists ad_creative_origins_org_ad_idx on ad_creative_origins (organization_id, ad_id);
