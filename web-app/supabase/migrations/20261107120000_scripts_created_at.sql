-- La tabla scripts de la base vieja tenía created_at; el schema base
-- reconstruido no la incluía y la pantalla de un guion ordena sus
-- variantes por esa columna (sin ella, las variantes no se mostraban).
alter table public.scripts add column if not exists created_at timestamptz default now();
update public.scripts set created_at = coalesce(updated_at, now()) where created_at is null;
