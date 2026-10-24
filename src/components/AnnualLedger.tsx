import { annualBreakdown, annualYears, billingServices, calculateSupport, chargeTotal, itemizedCharge, type BillingService } from "../lib/annual";
import { money, prettyDate } from "../lib/dates";
import type { AnnualBilling, AnnualProviderCost, Currency, Renewal, RenewalPayment } from "../lib/types";

type Props = {
  renewals: Renewal[];
  payments: RenewalPayment[];
  billing: AnnualBilling[];
  onEdit: (year: number, item?: AnnualBilling) => void;
};

const serviceNames: Record<BillingService, string> = { hosting: "Hosting", domain: "Dominio", support: "Soporte" };

function groupedMoney(amounts: { amount: number; currency: Currency }[]) {
  if (!amounts.length) return "Sin registrar";
  const totals = new Map<Currency, number>();
  amounts.forEach(({ amount, currency }) => totals.set(currency, (totals.get(currency) ?? 0) + amount));
  return [...totals].map(([currency, amount]) => money(amount, currency)).join(" · ");
}

function amount(value: number | null | undefined, currency: Currency) {
  return value === null || value === undefined ? "Sin registrar" : money(Number(value), currency);
}

function providerCost(cost: AnnualProviderCost, clientCurrency: Currency) {
  return <>
    <strong>{amount(cost.paid, cost.currency)}</strong>
    {cost.currency !== clientCurrency && <small>Equivalente en {clientCurrency}: {amount(cost.paid_client_currency, clientCurrency)}</small>}
  </>;
}

function supportAmount(result: ReturnType<typeof calculateSupport>, currency: Currency) {
  if (result.status === "ready") return money(result.amount, currency);
  if (result.status === "missing_total") return "Pendiente del total del cliente";
  if (result.status === "missing_equivalent") return "Pendiente del equivalente en la moneda del cliente";
  return "Pendiente del costo del proveedor";
}

export function AnnualLedger({ renewals, payments, billing, onEdit }: Props) {
  const providerRenewals = renewals.filter((renewal) => renewal.kind === "hosting" || renewal.kind === "domain");
  const providerPayments = payments.filter((payment) => providerRenewals.some((renewal) => renewal.id === payment.renewal_id));
  const years = annualYears(renewals, providerPayments, billing);
  return <div className="annual-ledger">
    <div className="annual-ledger-head">
      <div>
        <h4>Cobros y costos por año</h4>
        <p>El soporte se calcula desde el total recibido del cliente y los costos pagados a los proveedores. Cada moneda se muestra por separado.</p>
      </div>
      <button className="small-add" onClick={() => onEdit(new Date().getFullYear())}>+ Otro año</button>
    </div>
    {!years.length && <p className="muted-small">Agrega un año para registrar hosting, dominio y/o soporte.</p>}
    {years.map((year) => {
      const charge = billing.find((item) => item.billing_year === year);
      const { costs } = annualBreakdown(year, providerRenewals, providerPayments);
      const currency = charge?.currency ?? "PEN";
      const automatic = charge?.cost_breakdown?.version === 2 ? charge.cost_breakdown : null;
      const itemized = itemizedCharge(charge);
      const included = itemized ? billingServices.filter((service) =>
        charge?.[`charged_${service}`] !== null && charge?.[`charged_${service}`] !== undefined,
      ) : [];
      return <div className="annual-year" key={year}>
        <div className="annual-year-title">
          <div><strong>{year}</strong><span>{charge?.currency ?? "Moneda del cliente por definir"}</span></div>
          <button className="small-add" onClick={() => onEdit(year, charge)}>{charge ? "Editar cobro" : "Registrar cobro"}</button>
        </div>
        <div className="annual-column">
          <h5>Importes</h5>
          {automatic ? <>
            <div className="annual-total"><span>Total recibido del cliente</span><strong>{amount(chargeTotal(charge, "charged"), currency)}</strong></div>
            {charge?.charged_on && <small className="annual-date">Recibido el {prettyDate(charge.charged_on)}</small>}
            {(["hosting", "domain"] as const).filter((service) => automatic[service]).map((service) => <div className="annual-service-line" key={service}>
              <span>Pagado al proveedor de {serviceNames[service]}</span>
              {providerCost(automatic[service]!, currency)}
            </div>)}
            {automatic.support && <div className="annual-support"><span>Tu ingreso por soporte</span><strong>{supportAmount(calculateSupport(chargeTotal(charge, "charged"), automatic, currency, "charged"), currency)}</strong></div>}
          </> : itemized ? <>
            <div className="annual-total"><span>Total recibido del cliente</span><strong>{amount(chargeTotal(charge, "charged"), currency)}</strong></div>
            {charge?.charged_on && <small className="annual-date">Recibido el {prettyDate(charge.charged_on)}</small>}
            {included.map((service) => <div className="annual-service-line" key={service}>
              <span>{serviceNames[service]} cobrado al cliente</span>
              <strong>{amount(charge?.[`charged_${service}`], currency)}</strong>
              {service !== "support" && <small>Pagado al proveedor: {groupedMoney(costs.filter(({ renewal }) => renewal.kind === service).flatMap(({ history }) => history.map((payment) => ({ amount: Number(payment.provider_cost), currency: payment.currency }))))}</small>}
            </div>)}
          </> : <>
            <div className="annual-total"><span>Total recibido del cliente</span><strong>{amount(charge?.charged_total, currency)}</strong></div>
            {charge?.charged_on && <small className="annual-date">Recibido el {prettyDate(charge.charged_on)}</small>}
            {costs.map(({ renewal, history }) => <div className="annual-cost" key={renewal.id}><span>Pagado al proveedor de {renewal.label}</span><strong>{groupedMoney(history.map((payment) => ({ amount: Number(payment.provider_cost), currency: payment.currency })))}</strong></div>)}
          </>}
        </div>
        {charge && !automatic && <p className="annual-note">Registro del formulario anterior. Sus datos se conservaron; puedes editarlo para calcular el soporte a partir de los costos pagados al proveedor.</p>}
        {charge?.notes && <p className="annual-note">{charge.notes}</p>}
      </div>;
    })}
  </div>;
}
