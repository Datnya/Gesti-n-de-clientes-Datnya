import type { AnnualBilling, AnnualCostBreakdown, Currency, Renewal, RenewalPayment } from "./types";

export const billingServices = ["hosting", "domain", "support"] as const;
export type BillingService = (typeof billingServices)[number];

export function itemizedCharge(billing: AnnualBilling | undefined) {
  return Boolean(billing && billingServices.some((service) =>
    billing[`quoted_${service}`] !== null && billing[`quoted_${service}`] !== undefined ||
    billing[`charged_${service}`] !== null && billing[`charged_${service}`] !== undefined,
  ));
}

export function chargeTotal(billing: AnnualBilling | undefined, mode: "quoted" | "charged") {
  if (!billing) return null;
  if (billing.cost_breakdown?.version === 2) return billing[`${mode}_total`];
  if (!itemizedCharge(billing)) return billing[`${mode}_total`];
  const amounts = billingServices.map((service) => billing[`${mode}_${service}`]);
  return amounts.every((amount) => amount === null || amount === undefined)
    ? null
    : amounts.reduce<number>((total, amount) => total + Number(amount ?? 0), 0);
}

export function calculateSupport(
  total: number | null,
  breakdown: AnnualCostBreakdown,
  clientCurrency: Currency,
  mode: "quoted" | "charged",
) {
  if (!breakdown.support) return { status: "excluded" as const };
  if (total === null) return { status: "missing_total" as const };
  let providerTotal = 0;
  for (const service of ["hosting", "domain"] as const) {
    const cost = breakdown[service];
    if (!cost) continue;
    const original = mode === "quoted" ? cost.estimated : cost.paid;
    if (original === null) return { status: "missing_cost" as const, service };
    const equivalent = mode === "quoted" ? cost.estimated_client_currency : cost.paid_client_currency;
    if (cost.currency !== clientCurrency && equivalent === null)
      return { status: "missing_equivalent" as const, service };
    providerTotal += cost.currency === clientCurrency ? original : Number(equivalent);
  }
  return { status: "ready" as const, amount: Math.round((total - providerTotal) * 100) / 100 };
}

export const paymentYear = (payment: RenewalPayment) =>
  payment.billing_year ?? Number(payment.paid_on.slice(0, 4));

export function annualYears(
  renewals: Renewal[],
  payments: RenewalPayment[],
  billing: AnnualBilling[],
) {
  const years = new Set<number>(billing.map((item) => item.billing_year));
  payments.forEach((payment) => years.add(paymentYear(payment)));
  for (const renewal of renewals) {
    const dueYear = Number(renewal.due_date.slice(0, 4));
    const firstYear = renewal.first_purchased_on
      ? Number(renewal.first_purchased_on.slice(0, 4))
      : Math.min(
          dueYear,
          ...payments
            .filter((payment) => payment.renewal_id === renewal.id)
            .map(paymentYear),
        );
    years.add(firstYear);
    years.add(dueYear);
    if (renewal.billing_months === 12 && dueYear - firstYear < 30) {
      for (let year = firstYear + 1; year < dueYear; year++) years.add(year);
    }
  }
  return [...years].filter((year) => year >= 2000 && year <= 2100).sort((a, b) => b - a);
}

export function annualBreakdown(
  year: number,
  renewals: Renewal[],
  payments: RenewalPayment[],
) {
  const costs = renewals
    .filter((renewal) => renewal.kind === "hosting" || renewal.kind === "domain")
    .map((renewal) => {
      const history = payments.filter(
        (payment) => payment.renewal_id === renewal.id && paymentYear(payment) === year,
      );
      const dueThisYear = Number(renewal.due_date.slice(0, 4)) === year;
      const firstYear = renewal.first_purchased_on
        ? Number(renewal.first_purchased_on.slice(0, 4))
        : year;
      const active = history.length > 0 || dueThisYear ||
        (renewal.billing_months === 12 && renewal.first_purchased_on !== null &&
          firstYear <= year && year <= Number(renewal.due_date.slice(0, 4)));
      const sameCurrency = history.every((payment) => payment.currency === history[0]?.currency);
      const estimatedCost = dueThisYear ? renewal.provider_cost
        : history.length && sameCurrency && history.every((payment) => payment.quoted_provider_cost !== null)
          ? history.reduce((sum, payment) => sum + Number(payment.quoted_provider_cost), 0)
          : null;
      const estimatedCurrency = dueThisYear ? renewal.currency : (history[0]?.currency ?? renewal.currency);
      return { renewal, history, dueThisYear, active, estimatedCost, estimatedCurrency };
    })
    .filter((item) => item.active);

  return { costs };
}
