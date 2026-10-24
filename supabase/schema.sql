-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- La aplicación no incluye registro público: crear el usuario desde Authentication > Users.

create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_name text not null check (length(trim(company_name)) > 0),
  legal_name text,
  tax_id text,
  contact_name text,
  phone text,
  email text,
  website text,
  industry text,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table if not exists public.renewals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null,
  kind text not null check (kind in ('hosting', 'domain', 'support', 'other')),
  label text not null default '',
  due_date date not null,
  first_purchased_on date,
  provider_cost numeric(12,2) check (provider_cost >= 0),
  client_price numeric(12,2) not null default 0 check (client_price >= 0),
  currency text not null default 'PEN' check (currency in ('PEN', 'USD')),
  billing_months integer not null default 12 check (billing_months between 1 and 120),
  notes text,
  created_at timestamptz not null default now(),
  foreign key (client_id, owner_id) references public.clients(id, owner_id) on delete cascade,
  unique (id, owner_id)
);

create table if not exists public.renewal_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  renewal_id uuid not null,
  paid_on date not null,
  renewal_due_on date,
  billing_year integer check (billing_year between 2000 and 2100),
  provider_cost numeric(12,2) not null check (provider_cost >= 0),
  quoted_provider_cost numeric(12,2) check (quoted_provider_cost >= 0),
  client_price numeric(12,2) check (client_price >= 0),
  currency text not null default 'PEN' check (currency in ('PEN', 'USD')),
  notes text,
  created_at timestamptz not null default now(),
  foreign key (renewal_id, owner_id) references public.renewals(id, owner_id) on delete cascade,
  unique (renewal_id, renewal_due_on)
);

create table if not exists public.client_annual_billing (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null,
  billing_year integer not null check (billing_year between 2000 and 2100),
  currency text not null default 'PEN' check (currency in ('PEN', 'USD')),
  quoted_total numeric(12,2) check (quoted_total >= 0),
  charged_total numeric(12,2) check (charged_total >= 0),
  quoted_hosting numeric(12,2) check (quoted_hosting >= 0),
  quoted_domain numeric(12,2) check (quoted_domain >= 0),
  quoted_support numeric(12,2) check (quoted_support >= 0),
  charged_hosting numeric(12,2) check (charged_hosting >= 0),
  charged_domain numeric(12,2) check (charged_domain >= 0),
  charged_support numeric(12,2) check (charged_support >= 0),
  cost_breakdown jsonb check (cost_breakdown is null or jsonb_typeof(cost_breakdown) = 'object'),
  charged_on date,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (client_id, owner_id) references public.clients(id, owner_id) on delete cascade,
  unique (client_id, billing_year),
  check (quoted_total is not null or charged_total is not null)
);

create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null,
  service text not null check (length(trim(service)) > 0),
  login_email text,
  username text,
  login_url text,
  encrypted_password text,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (client_id, owner_id) references public.clients(id, owner_id) on delete cascade
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid,
  kind text not null check (kind in ('income', 'expense')),
  category text not null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'PEN' check (currency in ('PEN', 'USD')),
  occurred_on date not null,
  created_at timestamptz not null default now(),
  foreign key (client_id, owner_id) references public.clients(id, owner_id) on delete set null (client_id)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid,
  kind text not null default 'task' check (kind in ('task', 'deadline', 'meeting')),
  title text not null check (length(trim(title)) > 0),
  event_date date not null,
  remind_days integer not null default 7 check (remind_days between 0 and 365),
  notes text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (client_id, owner_id) references public.clients(id, owner_id) on delete set null (client_id)
);

create table if not exists public.vault_settings (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  verifier text not null
);

create table if not exists public.user_profiles (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  avatar_data text check (avatar_data is null or
    (length(avatar_data) <= 200000 and avatar_data like 'data:image/webp;base64,%'))
);

create index if not exists renewals_owner_due on public.renewals(owner_id, due_date);
create index if not exists renewal_payments_owner_date on public.renewal_payments(owner_id, paid_on desc);
create index if not exists annual_billing_owner_year on public.client_annual_billing(owner_id, billing_year desc);
create index if not exists transactions_owner_date on public.transactions(owner_id, occurred_on);
create index if not exists events_owner_date on public.calendar_events(owner_id, event_date);
create index if not exists credentials_owner_client on public.credentials(owner_id, client_id);

alter table public.clients enable row level security;
alter table public.renewals enable row level security;
alter table public.renewal_payments enable row level security;
alter table public.client_annual_billing enable row level security;
alter table public.credentials enable row level security;
alter table public.transactions enable row level security;
alter table public.calendar_events enable row level security;
alter table public.vault_settings enable row level security;
alter table public.user_profiles enable row level security;

drop policy if exists owner_clients on public.clients;
create policy owner_clients on public.clients for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists owner_renewals on public.renewals;
create policy owner_renewals on public.renewals for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists owner_renewal_payments on public.renewal_payments;
create policy owner_renewal_payments on public.renewal_payments for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
grant select, insert, update, delete on public.renewal_payments to authenticated;
drop policy if exists owner_annual_billing on public.client_annual_billing;
create policy owner_annual_billing on public.client_annual_billing for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
grant select, insert, update, delete on public.client_annual_billing to authenticated;
drop policy if exists owner_credentials on public.credentials;
create policy owner_credentials on public.credentials for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists owner_transactions on public.transactions;
create policy owner_transactions on public.transactions for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists owner_events on public.calendar_events;
create policy owner_events on public.calendar_events for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists owner_vault on public.vault_settings;
create policy owner_vault on public.vault_settings for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists owner_profiles on public.user_profiles;
create policy owner_profiles on public.user_profiles for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create or replace function public.mark_renewal_paid(p_renewal_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  item public.renewals%rowtype;
  company text;
begin
  select * into item from public.renewals
  where id = p_renewal_id and owner_id = auth.uid()
  for update;
  if not found then raise exception 'Vencimiento no encontrado'; end if;

  select company_name into company from public.clients where id = item.client_id;
  if item.provider_cost > 0 then
    insert into public.transactions(owner_id, client_id, kind, category, description, amount, currency, occurred_on)
    values (item.owner_id, item.client_id, 'expense', 'Hosting y dominios',
      'Pago de ' || item.label || ' · ' || company, item.provider_cost, item.currency,
      (now() at time zone 'America/Lima')::date);
  end if;

  update public.renewals
  set due_date = (item.due_date + make_interval(months => item.billing_months))::date
  where id = item.id and owner_id = auth.uid();
end;
$$;

revoke all on function public.mark_renewal_paid(uuid) from public;
grant execute on function public.mark_renewal_paid(uuid) to authenticated;

create or replace function public.record_renewal_payment(
  p_renewal_id uuid,
  p_expected_due_on date,
  p_paid_on date,
  p_provider_cost numeric,
  p_client_price numeric default null,
  p_next_provider_cost numeric default null,
  p_notes text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  item public.renewals%rowtype;
  company text;
begin
  if p_paid_on is null or p_provider_cost is null or p_provider_cost < 0
     or (p_client_price is not null and p_client_price < 0)
     or (p_next_provider_cost is not null and p_next_provider_cost < 0) then
    raise exception 'Revisa la fecha y los importes del pago';
  end if;
  select * into item from public.renewals
  where id = p_renewal_id and owner_id = auth.uid()
  for update;
  if not found then raise exception 'Servicio no encontrado'; end if;
  if item.due_date <> p_expected_due_on then
    raise exception 'El vencimiento cambió. Actualiza la página e inténtalo de nuevo';
  end if;

  insert into public.renewal_payments
    (owner_id, renewal_id, paid_on, renewal_due_on, billing_year, provider_cost, quoted_provider_cost, client_price, currency, notes)
  values
    (item.owner_id, item.id, p_paid_on, item.due_date, extract(year from item.due_date)::integer, p_provider_cost,
     item.provider_cost, p_client_price, item.currency, p_notes);

  if p_provider_cost > 0 then
    select company_name into company from public.clients where id = item.client_id;
    insert into public.transactions
      (owner_id, client_id, kind, category, description, amount, currency, occurred_on)
    values
      (item.owner_id, item.client_id, 'expense', 'Hosting y dominios',
       'Pago de ' || item.label || ' · ' || company, p_provider_cost, item.currency, p_paid_on);
  end if;

  update public.renewals
  set due_date = (item.due_date + make_interval(months => item.billing_months))::date,
      provider_cost = p_next_provider_cost
  where id = item.id and owner_id = auth.uid();
end;
$$;

revoke all on function public.record_renewal_payment(uuid, date, date, numeric, numeric, numeric, text) from public;
grant execute on function public.record_renewal_payment(uuid, date, date, numeric, numeric, numeric, text) to authenticated;
