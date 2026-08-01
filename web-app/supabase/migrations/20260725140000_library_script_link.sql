-- Puente Guiones → Biblioteca de Ads: relación muchos-a-uno (un guion puede
-- generar varios cortes de creativo; cada creativo viene de un solo guion,
-- o de ninguno si se subió suelto) — una FK simple alcanza, sin tabla
-- puente. on delete set null: borrar un guion no debe borrar creativos que
-- ya nacieron de él y capaz ya están desplegados en un anuncio real.
--
-- `scripts.id` es `text`, no `uuid` (tabla legacy) — la FK tiene que
-- coincidir en tipo o Postgres rechaza el constraint (42804).
alter table library_creatives add column source_script_id text references scripts(id) on delete set null;

create index if not exists library_creatives_source_script_idx on library_creatives (source_script_id);
