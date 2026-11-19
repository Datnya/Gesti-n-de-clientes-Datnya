-- Aplicar en el proyecto Supabase de la plataforma antes de usar el generador conectado.
create table public.invitations (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null,
  title text not null,
  active boolean not null default false,
  expires_at timestamptz not null,
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  foreign key (client_id,owner_id) references public.clients(id,owner_id) on delete cascade
);
alter table public.invitations enable row level security;
revoke all on public.invitations from anon, authenticated;
grant select,insert,update,delete on public.invitations to authenticated;
create policy owner_invitations on public.invitations for all to authenticated
using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create function public.open_invitation(invite_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select payload from public.invitations where id=invite_id and active and expires_at>now()
$$;
revoke all on function public.open_invitation(uuid) from public;
grant execute on function public.open_invitation(uuid) to anon,authenticated;
create extension if not exists pg_cron;
select cron.schedule('purge-expired-invitations','15 * * * *',$$delete from public.invitations where expires_at<=now()$$);
