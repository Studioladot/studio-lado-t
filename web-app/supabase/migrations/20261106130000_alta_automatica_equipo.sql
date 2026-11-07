-- Uso interno: cuando una cuenta del equipo se registra por primera vez,
-- entra directo como admin de todas las organizaciones (clientes), sin
-- pasar por el onboarding ni crear organizaciones duplicadas.
-- Mantener esta lista igual que src/lib/auth/allowlist.ts.
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

  if lower(new.email) in ('studioladot@gmail.com') then
    insert into public.organization_members (organization_id, user_id, role)
    select o.id, new.id, 'admin' from public.organizations o
    on conflict (organization_id, user_id) do nothing;
  end if;

  return new;
end;
$$;
