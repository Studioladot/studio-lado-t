-- Cobros automáticos (2026-11-12) — reemplaza los % manuales de "Comisión
-- Tienda Nube" y "Comisión Pasarela" de fin_config (que nadie sabía qué
-- poner). Con estos 4-5 datos de la cuenta, Gotix calcula sola la comisión
-- de cada orden según cómo se cobró (transferencia, Pago Nube con tarjeta,
-- cuotas, etc.) — ver src/lib/tiendanube/payment-fees.ts.

create table if not exists public.payment_fee_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  -- Plan de Tienda Nube: define el costo por transacción (ventas sin Pago
  -- Nube) y las tasas de Pago Nube. 'inicial' | 'esencial' | 'impulso' | 'escala'.
  tn_plan text check (tn_plan in ('inicial', 'esencial', 'impulso', 'escala')),
  -- Días en que Pago Nube libera la plata de las ventas con tarjeta.
  pago_nube_release_days integer check (pago_nube_release_days in (1, 7, 14, 30)),
  -- Situación ante ARCA: define si se suma IVA a las comisiones (o el 10,5%
  -- sobre el total para no inscriptos).
  tax_condition text check (tax_condition in ('responsable_inscripto', 'monotributo', 'no_inscripto')),
  -- Costo de cuotas sin interés que absorbe la tienda, en % por cantidad de
  -- cuotas: {"3": 10.2, "6": 10.3}. Sin entrada = esas cuotas las paga el cliente.
  installment_costs jsonb not null default '{}'::jsonb,
  -- Retenciones de Ingresos Brutos (SIRTAC/AGIP) sobre las ventas con Pago Nube, en %.
  retenciones_pct numeric,
  -- Comisión de otras pasarelas (Mercado Pago, etc.), en %, si la tienda las usa.
  other_gateway_pct numeric,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.payment_fee_settings enable row level security;

-- Mismo criterio que el resto de las tablas de negocio: cualquier miembro de
-- la organización lee y escribe la configuración de esa organización.
drop policy if exists "payment_fee_settings_member_select" on public.payment_fee_settings;
create policy "payment_fee_settings_member_select" on public.payment_fee_settings
  for select to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = payment_fee_settings.organization_id and m.user_id = auth.uid()));

drop policy if exists "payment_fee_settings_member_insert" on public.payment_fee_settings;
create policy "payment_fee_settings_member_insert" on public.payment_fee_settings
  for insert to authenticated
  with check (exists (select 1 from public.organization_members m where m.organization_id = payment_fee_settings.organization_id and m.user_id = auth.uid()));

drop policy if exists "payment_fee_settings_member_update" on public.payment_fee_settings;
create policy "payment_fee_settings_member_update" on public.payment_fee_settings
  for update to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = payment_fee_settings.organization_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.organization_members m where m.organization_id = payment_fee_settings.organization_id and m.user_id = auth.uid()));
