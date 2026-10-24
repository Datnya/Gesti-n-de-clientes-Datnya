-- Guarda los costos de proveedores usados para calcular el soporte.
-- Los balances anteriores permanecen intactos con cost_breakdown NULL.
alter table public.client_annual_billing
  add column if not exists cost_breakdown jsonb
  check (cost_breakdown is null or jsonb_typeof(cost_breakdown) = 'object');
