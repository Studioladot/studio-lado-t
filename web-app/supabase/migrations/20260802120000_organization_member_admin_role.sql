-- P2 (auditoría de cierre, 2026-07-30): nivel de rol 'admin' para poder
-- delegar gestión de equipo sin tener que compartir la cuenta de dueño.
--
-- organization_members no tiene ninguna migración propia en este repo (ver
-- auditoría de seguridad — es una de las ~45 tablas core creadas directo
-- contra la base, antes de que este repo empezara a versionar el schema).
-- No sabemos si su columna `role` tiene hoy un CHECK constraint que solo
-- permite ('owner', 'member'), ni cómo se llama ese constraint si existe.
-- El bloque de abajo lo busca dinámicamente (cualquier CHECK sobre esta
-- tabla cuya definición mencione "role") y lo reemplaza por uno que
-- contempla 'admin' — no falla si no encuentra ninguno.
do $$
declare
  con record;
begin
  for con in
    select conname
    from pg_constraint
    where conrelid = 'organization_members'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table organization_members drop constraint %I', con.conname);
  end loop;
end $$;

alter table organization_members
  add constraint organization_members_role_check
  check (role in ('owner', 'admin', 'member'));

-- update_member_role: promueve/degrada a Admin. Es una función NUEVA, no
-- una edición de invite_member_by_email/remove_member (esas 2 ya existen en
-- la base pero no están versionadas acá — no se tocan por no tener
-- visibilidad de su lógica actual). Mismo patrón de seguridad que se infiere
-- de esas 2 por cómo team/actions.ts consume sus errores (SECURITY DEFINER
-- + "only owners" como mensaje de excepción para que el cliente lo pueda
-- traducir igual que ya hace con invite_member_by_email).
create or replace function update_member_role(org_id uuid, target_user_id uuid, new_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  target_role text;
begin
  if new_role not in ('admin', 'member') then
    return jsonb_build_object('ok', false, 'error', 'invalid_role');
  end if;

  select role into caller_role
  from organization_members
  where organization_id = org_id and user_id = auth.uid();

  if caller_role is distinct from 'owner' then
    raise exception 'only owners can change member roles';
  end if;

  select role into target_role
  from organization_members
  where organization_id = org_id and user_id = target_user_id;

  if target_role is null then
    return jsonb_build_object('ok', false, 'error', 'not_a_member');
  end if;

  -- El dueño nunca se degrada por esta vía — transferir la titularidad de
  -- la organización es una decisión distinta y más sensible, fuera de
  -- alcance acá (no hay ninguna UI que lo pida todavía).
  if target_role = 'owner' then
    return jsonb_build_object('ok', false, 'error', 'cannot_change_owner');
  end if;

  update organization_members
  set role = new_role
  where organization_id = org_id and user_id = target_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function update_member_role(uuid, uuid, text) from public;
grant execute on function update_member_role(uuid, uuid, text) to authenticated;
