import test from "node:test";
import assert from "node:assert/strict";
import { annualBreakdown, annualYears } from "../src/lib/annual.ts";

const service = (id, kind, dueDate, firstDate, estimate, currency = "PEN") => ({
  id, kind, due_date: dueDate, first_purchased_on: firstDate,
  provider_cost: estimate, currency, billing_months: 12,
});
const payment = (renewalId, year, cost, currency = "PEN", quote = null) => ({
  renewal_id: renewalId, billing_year: year, paid_on: `${year}-01-15`,
  provider_cost: cost, quoted_provider_cost: quote, currency,
});

test("separa el primer año real de la cotización del segundo", () => {
  const services = [
    service("hosting", "hosting", "2026-11-10", "2025-11-10", 280),
    service("domain", "domain", "2026-12-09", "2025-12-09", 65),
  ];
  const payments = [payment("hosting", 2025, 120), payment("domain", 2025, 30)];
  const first = annualBreakdown(2025, services, payments, { charged_total: 200, quoted_total: 200, currency: "PEN" });
  const second = annualBreakdown(2026, services, payments, { charged_total: null, quoted_total: 500, currency: "PEN" });
  assert.equal(first.actualSupport.amount, 50);
  assert.equal(first.estimatedSupport.reason, "costs");
  assert.equal(second.estimatedSupport.amount, 155);
  assert.deepEqual(annualYears(services, payments, []), [2026, 2025]);
});

test("no calcula soporte cuando se mezclan dólares y soles", () => {
  const services = [
    service("hosting", "hosting", "2026-11-10", "2025-11-10", 280),
    service("domain", "domain", "2026-12-09", "2025-12-09", 15, "USD"),
  ];
  const payments = [payment("hosting", 2025, 120), payment("domain", 2025, 10, "USD")];
  const first = annualBreakdown(2025, services, payments, { charged_total: 200, quoted_total: null, currency: "PEN" });
  const second = annualBreakdown(2026, services, payments, { charged_total: null, quoted_total: 500, currency: "PEN" });
  assert.equal(first.actualSupport.reason, "currency");
  assert.equal(second.estimatedSupport.reason, "currency");
});

test("no presenta un soporte inflado si falta un pago del proveedor", () => {
  const services = [
    service("hosting", "hosting", "2026-11-10", "2025-11-10", 280),
    service("domain", "domain", "2026-12-09", "2025-12-09", 65),
  ];
  const result = annualBreakdown(2025, services, [payment("hosting", 2025, 120)], { charged_total: 200, quoted_total: null, currency: "PEN" });
  assert.equal(result.actualSupport.reason, "costs");
});

test("no suma un servicio de soporte por segunda vez al total del paquete", () => {
  const services = [
    service("hosting", "hosting", "2026-11-10", "2025-11-10", 280),
    service("domain", "domain", "2026-12-09", "2025-12-09", 65),
    { ...service("support", "support", "2026-12-09", "2025-12-09", 0), client_price: 50 },
  ];
  const payments = [payment("hosting", 2025, 120), payment("domain", 2025, 30)];
  const result = annualBreakdown(2025, services, payments, { charged_total: 200, quoted_total: null, currency: "PEN" });
  assert.equal(result.actualSupport.amount, 50);
  assert.equal(result.costs.length, 2);
});

test("conserva la cotización del año pagado al avanzar el vencimiento", () => {
  const services = [service("hosting", "hosting", "2027-11-10", "2025-11-10", 310)];
  const payments = [payment("hosting", 2026, 290, "PEN", 280)];
  const result = annualBreakdown(2026, services, payments, { charged_total: 480, quoted_total: 450, currency: "PEN" });
  assert.equal(result.actualSupport.amount, 190);
  assert.equal(result.estimatedSupport.amount, 170);
});
