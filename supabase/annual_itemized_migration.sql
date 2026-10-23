-- Añade el desglose por concepto a los cobros anuales sin alterar registros anteriores.
-- Los totales históricos permanecen intactos; sus columnas nuevas quedan NULL hasta que se editen.
alter table public.client_annual_billing
  add column if not exists quoted_hosting numeric(12,2) check (quoted_hosting >= 0),
  add column if not exists quoted_domain numeric(12,2) check (quoted_domain >= 0),
  add column if not exists quoted_support numeric(12,2) check (quoted_support >= 0),
  add column if not exists charged_hosting numeric(12,2) check (charged_hosting >= 0),
  add column if not exists charged_domain numeric(12,2) check (charged_domain >= 0),
  add column if not exists charged_support numeric(12,2) check (charged_support >= 0);
