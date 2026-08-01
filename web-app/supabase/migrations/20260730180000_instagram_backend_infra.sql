-- Infraestructura de backend para Instagram: scheduling real (caption +
-- reintentos), vínculo de identidad de Facebook para poder atender el Data
-- Deletion Callback que exige Meta, y la tabla de solicitudes de borrado.

-- ── content_piezas: copy real + reintentos acotados ──────────────────────
-- `caption` es el texto que se publica en Instagram — no existía ninguna
-- columna para esto (titulo es una referencia interna, notas son
-- comentarios de producción del equipo; ninguna de las dos debe filtrarse
-- como copy público). `retry_count` respalda la política de "3 intentos
-- con backoff antes de failed" del plan de instagram-publish-run.
alter table content_piezas
  add column if not exists caption text,
  add column if not exists retry_count integer not null default 0;

-- ── Identidad de Facebook — necesaria para el Data Deletion Callback ─────
-- Meta identifica al usuario que pide el borrado por su fb user id (viene
-- en el signed_request), no por nuestro user_id de Supabase. Sin guardar
-- este id en el momento de la conexión, el callback no tiene forma de
-- encontrar qué conexiones borrar — se guarda ahora, en las dos tablas que
-- almacenan tokens de Meta.
alter table meta_connections
  add column if not exists fb_user_id text;

alter table instagram_connections
  add column if not exists fb_user_id text;

create index if not exists meta_connections_fb_user_idx on meta_connections (fb_user_id);
create index if not exists instagram_connections_fb_user_idx on instagram_connections (fb_user_id);

-- ── data_deletion_requests ────────────────────────────────────────────────
-- No es organization_id-scoped a propósito: una misma identidad de Facebook
-- puede haber conectado varias organizaciones (una agencia manejando
-- varios clientes), y Meta pide el borrado por esa identidad, no por
-- organización. Sin RLS policies — solo la Service Role (Next.js API route
-- del webhook + la página de estado, ambas server-only) puede leer/escribir
-- acá, nunca un cliente autenticado normal.
create table if not exists data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  fb_user_id text not null,
  confirmation_code text not null unique,
  requested_at timestamptz not null default now(),
  status text not null default 'received' check (status in ('received', 'completed')),
  completed_at timestamptz
);

alter table data_deletion_requests enable row level security;

create index if not exists data_deletion_requests_fb_user_idx on data_deletion_requests (fb_user_id);
