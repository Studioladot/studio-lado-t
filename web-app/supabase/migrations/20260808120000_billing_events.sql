-- Arquitectura de Trial/Paywall/Mercado Pago (2026-08-08). `organizations`
-- YA tiene `plan` (text) y `trial_ends_at` (timestamptz, agregada en
-- 20260725160000_intelligence_and_billing.sql) — no hace falta ninguna
-- columna nueva ahí, el estado de trial se deriva de esas dos en código
-- (ver lib/billing/subscription.ts) en vez de guardar un booleano
-- redundante tipo `trial_active` que podría desincronizarse de
-- `trial_ends_at` con el tiempo.
--
-- billing_events es la auditoría de lo que Mercado Pago nos avisa por
-- webhook — nunca se confía en el body del webhook para actualizar el plan
-- (ver api/mercadopago/webhook/route.ts: siempre se re-consulta el pago
-- real contra la API de MP con nuestro propio access token antes de tocar
-- `organizations`), pero igual queda registrado cada evento recibido para
-- poder auditar/debuggear un cobro que no se reflejó como se esperaba.
create table if not exists billing_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  mp_payment_id text not null,
  mp_preference_id text,
  status text not null,
  plan text,
  amount numeric,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

alter table billing_events enable row level security;

-- Solo lectura para miembros de la organización (ej. futura pantalla de
-- "historial de pagos") — el insert lo hace únicamente el webhook, vía
-- Service Role (bypassea RLS por completo, mismo criterio ya usado por el
-- Data Deletion Callback de Meta), nunca desde el cliente autenticado
-- normal, así que no hace falta una policy de insert acá.
create policy "org members read billing events"
  on billing_events for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

create index if not exists billing_events_org_idx on billing_events (organization_id, created_at desc);
create index if not exists billing_events_payment_idx on billing_events (mp_payment_id);
