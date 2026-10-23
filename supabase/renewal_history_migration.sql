-- Migración aditiva para proyectos que ya contienen clientes y servicios.
-- Conserva todos los importes y vencimientos existentes. Los pagos anteriores
-- se agregan manualmente porque no podemos deducir su fecha ni costo real.

alter table public.clients add column if not exists industry text;
alter table public.renewals add column if not exists first_purchased_on date;
alter table public.renewals alter column provider_cost drop not null;
alter table public.renewals alter column provider_cost drop default;

create unique index if not exists renewals_id_owner_unique
  on public.renewals(id, owner_id);

create table if not exists public.renewal_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  renewal_id uuid not null,
  paid_on date not null,
  renewal_due_on date,
  provider_cost numeric(12,2) not null check (provider_cost >= 0),
  client_price numeric(12,2) check (client_price >= 0),
  currency text not null default 'PEN' check (currency in ('PEN', 'USD')),
  notes text,
  created_at timestamptz not null default now(),
  foreign key (renewal_id, owner_id) references public.renewals(id, owner_id) on delete cascade,
  unique (renewal_id, renewal_due_on)
);

create index if not exists renewal_payments_owner_date
  on public.renewal_payments(owner_id, paid_on desc);
alter table public.renewal_payments enable row level security;
drop policy if exists owner_renewal_payments on public.renewal_payments;
create policy owner_renewal_payments on public.renewal_payments for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
grant select, insert, update, delete on public.renewal_payments to authenticated;

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
    (owner_id, renewal_id, paid_on, renewal_due_on, provider_cost, client_price, currency, notes)
  values
    (item.owner_id, item.id, p_paid_on, item.due_date, p_provider_cost,
     p_client_price, item.currency, p_notes);

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

