-- Conexión de Claude a Gotix (api/mcp/[token]) — 2026-11-12.
--
-- Cada usuario genera una dirección privada desde Configuración >
-- Integraciones. La dirección lleva una clave aleatoria; acá se guarda solo
-- su hash SHA-256 (nunca la clave en texto plano), así que ni con acceso a
-- la base se puede reconstruir la dirección. Generar una nueva revoca la
-- anterior (revoked_at). La clave da acceso de SOLO LECTURA a las
-- organizaciones de las que el usuario es miembro — el endpoint resuelve
-- las membresías en cada pedido, así que sacar a alguien de una
-- organización le corta el acceso a esa cuenta en el acto.

create table if not exists public.claude_access_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  -- Últimos 4 caracteres de la clave, para que el usuario reconozca cuál
  -- dirección está activa sin mostrarla entera.
  token_hint text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists claude_access_tokens_user_idx on public.claude_access_tokens (user_id);

alter table public.claude_access_tokens enable row level security;

-- El usuario solo ve sus propias claves (fecha, últimos 4 caracteres,
-- último uso). Alta y revocación pasan por server actions con el cliente de
-- sesión, así que también se limitan a sus propias filas. El endpoint de
-- Claude busca por hash con service_role (no hay sesión en ese pedido).
drop policy if exists "claude_access_tokens_select_own" on public.claude_access_tokens;
create policy "claude_access_tokens_select_own" on public.claude_access_tokens
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "claude_access_tokens_insert_own" on public.claude_access_tokens;
create policy "claude_access_tokens_insert_own" on public.claude_access_tokens
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "claude_access_tokens_update_own" on public.claude_access_tokens;
create policy "claude_access_tokens_update_own" on public.claude_access_tokens
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
