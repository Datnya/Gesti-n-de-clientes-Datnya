import type { AnnualBilling, Currency, Renewal, RenewalPayment } from "./types";

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
  billing: AnnualBilling | undefined,
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

  function supportAmount(mode: "actual" | "estimate") {
    const total = mode === "actual" ? billing?.charged_total : billing?.quoted_total;
    if (total === null || total === undefined) return { reason: "total" as const };
    const lines = costs;
    if (!lines.length) return { reason: "costs" as const };
    if (mode === "actual" && renewals.some((renewal) =>
      (renewal.kind === "hosting" || renewal.kind === "domain") && renewal.first_purchased_on === null &&
      Number(renewal.due_date.slice(0, 4)) > year &&
      !payments.some((payment) => payment.renewal_id === renewal.id && paymentYear(payment) === year),
    )) return { reason: "costs" as const };
    if (mode === "actual" && lines.some((item) => !item.history.length))
      return { reason: "costs" as const };
    if (mode === "estimate" && lines.some((item) => item.estimatedCost === null))
      return { reason: "costs" as const };
    const currencies = mode === "actual"
      ? lines.flatMap((item) => item.history.map((payment) => payment.currency))
      : lines.map((item) => item.estimatedCurrency);
    if (currencies.some((currency) => currency !== billing?.currency))
      return { reason: "currency" as const };
    const providerTotal = mode === "actual"
      ? lines.reduce((sum, item) => sum + item.history.reduce((value, payment) => value + Number(payment.provider_cost), 0), 0)
      : lines.reduce((sum, item) => sum + Number(item.estimatedCost), 0);
    return { reason: "ready" as const, amount: Number(total) - providerTotal, currency: billing?.currency as Currency };
  }

  return { costs, actualSupport: supportAmount("actual"), estimatedSupport: supportAmount("estimate") };
}
