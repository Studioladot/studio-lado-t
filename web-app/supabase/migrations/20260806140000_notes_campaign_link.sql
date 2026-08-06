-- Killer feature de cierre de Fase 1 (2026-08-06): Notas era el único de
-- los 3 módulos hermanos (Contenido, Campañas, Notas) sin ninguna relación
-- con los otros dos — un bloc de notas suelto por organización, sin forma
-- de dejar contexto pegado a una campaña real. FK nullable (no todas las
-- notas van a estar atadas a una campaña — "Fechas importantes"/"Varios"
-- suelen ser generales) con ON DELETE SET NULL: borrar una campaña no debe
-- borrar las notas que se escribieron sobre ella, solo desvincularlas.
alter table public.notes
  add column campaign_id uuid references public.content_campaigns(id) on delete set null;

create index if not exists notes_campaign_id_idx on public.notes(campaign_id);
