-- Aplicar una sola vez al proyecto que ya tiene schema.sql instalado.
create table if not exists public.user_profiles (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  avatar_data text check (avatar_data is null or
    (length(avatar_data) <= 200000 and avatar_data like 'data:image/webp;base64,%'))
);

alter table public.user_profiles enable row level security;

create policy owner_profiles on public.user_profiles for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
