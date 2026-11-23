create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (trim(name) <> ''),
  service text not null check (trim(service) <> ''),
  contact text,
  stage text not null default 'Primera interacción'
    check (stage in ('Primera interacción','Reunión y propuesta','Seguimiento','Servicio cerrado')),
  meeting_on date,
  follow_on date,
  follow_type text,
  notes text
);
create index if not exists prospects_owner_name on public.prospects(owner_id, name);
alter table public.prospects enable row level security;
drop policy if exists prospects_owner on public.prospects;
create policy prospects_owner on public.prospects for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
grant select, insert, update on public.prospects to authenticated;
