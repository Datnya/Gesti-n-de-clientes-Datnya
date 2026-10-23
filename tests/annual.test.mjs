import test from "node:test";
import assert from "node:assert/strict";
import { annualBreakdown, annualYears, chargeTotal, itemizedCharge } from "../src/lib/annual.ts";
import { credentialPriority } from "../src/lib/credentials.ts";

const service = (id, kind, dueDate, firstDate, estimate, currency = "PEN") => ({
  id, kind, due_date: dueDate, first_purchased_on: firstDate,
  provider_cost: estimate, currency, billing_months: 12,
});
const payment = (renewalId, year, cost, currency = "PEN", quote = null) => ({
  renewal_id: renewalId, billing_year: year, paid_on: `${year}-01-15`,
  provider_cost: cost, quoted_provider_cost: quote, currency,
});

test("mantiene separados los pagos reales del primer año y la estimación del segundo", () => {
  const services = [
    service("hosting", "hosting", "2026-11-10", "2025-11-10", 280),
    service("domain", "domain", "2026-12-09", "2025-12-09", 65),
  ];
  const payments = [payment("hosting", 2025, 120), payment("domain", 2025, 30)];
  const first = annualBreakdown(2025, services, payments);
  const second = annualBreakdown(2026, services, payments);
  assert.deepEqual(first.costs.map((item) => item.history[0].provider_cost), [120, 30]);
  assert.deepEqual(second.costs.map((item) => item.estimatedCost), [280, 65]);
  assert.deepEqual(annualYears(services, payments, []), [2026, 2025]);
});

test("el total del cliente es la suma de los tres cobros explícitos, no de los costos del proveedor", () => {
  const billing = {
    currency: "PEN", quoted_total: 999, charged_total: 999,
    quoted_hosting: 150, quoted_domain: 30, quoted_support: 50,
    charged_hosting: 150, charged_domain: 30, charged_support: 50,
  };
  assert.equal(itemizedCharge(billing), true);
  assert.equal(chargeTotal(billing, "quoted"), 230);
  assert.equal(chargeTotal(billing, "charged"), 230);
  const costs = annualBreakdown(2025, [
    service("hosting", "hosting", "2026-11-10", "2025-11-10", 280),
    service("domain", "domain", "2026-12-09", "2025-12-09", 65),
  ], [payment("hosting", 2025, 120), payment("domain", 2025, 25)]).costs;
  assert.equal(costs.reduce((sum, item) => sum + item.history[0].provider_cost, 0), 145);
  assert.equal(billing.charged_support, 50);
});

test("acepta hosting, dominio o soporte por separado, incluso con cobro cero", () => {
  for (const serviceName of ["hosting", "domain", "support"]) {
    const billing = {
      quoted_total: null, charged_total: null,
      quoted_hosting: null, quoted_domain: null, quoted_support: null,
      charged_hosting: null, charged_domain: null, charged_support: null,
      [`charged_${serviceName}`]: 0,
    };
    assert.equal(itemizedCharge(billing), true);
    assert.equal(chargeTotal(billing, "charged"), 0);
    assert.equal(chargeTotal(billing, "quoted"), null);
  }
  assert.deepEqual(annualYears([service("support", "support", "2026-11-10", "2025-11-10", 0)], [], []), [2026, 2025]);
});

test("un proveedor en USD conserva su moneda y no altera el cobro en PEN", () => {
  const costs = annualBreakdown(2025, [
    service("domain", "domain", "2026-12-09", "2025-12-09", 15, "USD"),
  ], [payment("domain", 2025, 10, "USD")]).costs;
  assert.equal(costs[0].history[0].currency, "USD");
  assert.equal(chargeTotal({ charged_domain: 60, charged_hosting: null, charged_support: 20, quoted_domain: null, quoted_hosting: null, quoted_support: null }, "charged"), 80);
});

test("conserva los totales de registros anteriores que todavía no tienen desglose", () => {
  const previous = { quoted_total: 230, charged_total: 230 };
  assert.equal(itemizedCharge(previous), false);
  assert.equal(chargeTotal(previous, "charged"), 230);
});

test("el costo estimado del proveedor del año pagado no cambia al avanzar el vencimiento", () => {
  const costs = annualBreakdown(2026, [
    service("hosting", "hosting", "2027-11-10", "2025-11-10", 310),
  ], [payment("hosting", 2026, 290, "PEN", 280)]).costs;
  assert.equal(costs[0].history[0].provider_cost, 290);
  assert.equal(costs[0].estimatedCost, 280);
});

test("ordena cPanel y Namecheap antes de los demás accesos sin importar mayúsculas", () => {
  const services = ["Gmail", "NameCheap", "Hosting", " cPanel ", "Outlook"];
  assert.deepEqual(services.sort((a, b) => credentialPriority(a) - credentialPriority(b)), [
    " cPanel ", "NameCheap", "Gmail", "Hosting", "Outlook",
  ]);
});
