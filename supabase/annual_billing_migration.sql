-- Amplía el historial sin modificar importes ni vencimientos existentes.
-- Los pagos previos conservan billing_year NULL; la interfaz usa el año de paid_on.
alter table public.renewal_payments
  add column if not exists billing_year integer check (billing_year between 2000 and 2100);
alter table public.renewal_payments
  add column if not exists quoted_provider_cost numeric(12,2) check (quoted_provider_cost >= 0);

create table if not exists public.client_annual_billing (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null,
  billing_year integer not null check (billing_year between 2000 and 2100),
  currency text not null default 'PEN' check (currency in ('PEN', 'USD')),
  quoted_total numeric(12,2) check (quoted_total >= 0),
  charged_total numeric(12,2) check (charged_total >= 0),
  charged_on date,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (client_id, owner_id) references public.clients(id, owner_id) on delete cascade,
  unique (client_id, billing_year),
  check (quoted_total is not null or charged_total is not null)
);

create index if not exists annual_billing_owner_year
  on public.client_annual_billing(owner_id, billing_year desc);
alter table public.client_annual_billing enable row level security;
drop policy if exists owner_annual_billing on public.client_annual_billing;
create policy owner_annual_billing on public.client_annual_billing for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
grant select, insert, update, delete on public.client_annual_billing to authenticated;

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

