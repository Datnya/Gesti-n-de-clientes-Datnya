import test from "node:test";
import assert from "node:assert/strict";
import { annualBreakdown, annualYears, calculateSupport, chargeTotal, itemizedCharge } from "../src/lib/annual.ts";
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

test("calcula soporte automáticamente a partir del total y los costos reales del proveedor", () => {
  const billing = {
    currency: "PEN", quoted_total: 230, charged_total: 230,
    cost_breakdown: {
      version: 2,
      hosting: { currency: "PEN", estimated: 50, paid: 50, estimated_client_currency: null, paid_client_currency: null },
      domain: { currency: "PEN", estimated: 50, paid: 50, estimated_client_currency: null, paid_client_currency: null },
      support: true,
    },
  };
  assert.equal(chargeTotal(billing, "quoted"), 230);
  assert.equal(chargeTotal(billing, "charged"), 230);
  assert.equal(calculateSupport(billing.charged_total, billing.cost_breakdown, "PEN", "charged").amount, 130);
  assert.equal(calculateSupport(billing.quoted_total, billing.cost_breakdown, "PEN", "quoted").amount, 130);
});

test("admite solo soporte, solo hosting o hosting con soporte", () => {
  const hosting = { currency: "PEN", estimated: 50, paid: 50, estimated_client_currency: null, paid_client_currency: null };
  assert.equal(calculateSupport(230, { version: 2, hosting: null, domain: null, support: true }, "PEN", "charged").amount, 230);
  assert.equal(calculateSupport(230, { version: 2, hosting, domain: null, support: true }, "PEN", "charged").amount, 180);
  assert.equal(calculateSupport(230, { version: 2, hosting, domain: null, support: false }, "PEN", "charged").status, "excluded");
  assert.deepEqual(annualYears([service("support", "support", "2026-11-10", "2025-11-10", 0)], [], []), [2026, 2025]);
});

test("para USD y PEN usa el equivalente ingresado y no mezcla las monedas", () => {
  const domain = { currency: "USD", estimated: 10, paid: 10, estimated_client_currency: 38, paid_client_currency: 38 };
  const breakdown = { version: 2, hosting: null, domain, support: true };
  assert.equal(calculateSupport(230, breakdown, "PEN", "charged").amount, 192);
  assert.equal(calculateSupport(230, { ...breakdown, domain: { ...domain, paid_client_currency: null } }, "PEN", "charged").status, "missing_equivalent");
});

test("conserva los totales de registros anteriores que todavía no tienen desglose", () => {
  const previous = { quoted_total: 230, charged_total: 230 };
  assert.equal(itemizedCharge(previous), false);
  assert.equal(chargeTotal(previous, "charged"), 230);
  const previousItemized = {
    quoted_total: 999, charged_total: 999,
    quoted_hosting: 50, quoted_domain: 50, quoted_support: 130,
    charged_hosting: 50, charged_domain: 50, charged_support: 130,
  };
  assert.equal(chargeTotal(previousItemized, "charged"), 230);
});

test("si falta un costo real, el soporte real queda pendiente aunque exista presupuesto", () => {
  const breakdown = {
    version: 2,
    hosting: { currency: "PEN", estimated: 50, paid: null, estimated_client_currency: null, paid_client_currency: null },
    domain: null,
    support: true,
  };
  assert.equal(calculateSupport(230, breakdown, "PEN", "quoted").amount, 180);
  assert.equal(calculateSupport(230, breakdown, "PEN", "charged").status, "missing_cost");
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
