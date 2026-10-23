import { annualBreakdown, annualYears, billingServices, chargeTotal, itemizedCharge, type BillingService } from "../lib/annual";
import { money, prettyDate } from "../lib/dates";
import type { AnnualBilling, Currency, Renewal, RenewalPayment } from "../lib/types";

type Props = {
  renewals: Renewal[];
  payments: RenewalPayment[];
  billing: AnnualBilling[];
  onEdit: (year: number, item?: AnnualBilling) => void;
};

const serviceNames: Record<BillingService, string> = {
  hosting: "Hosting",
  domain: "Dominio",
  support: "Soporte",
};

function groupedMoney(amounts: { amount: number; currency: Currency }[]) {
  if (!amounts.length) return "Sin registrar";
  const totals = new Map<Currency, number>();
  amounts.forEach(({ amount, currency }) => totals.set(currency, (totals.get(currency) ?? 0) + amount));
  return [...totals].map(([currency, amount]) => money(amount, currency)).join(" · ");
}

function providerMoney(costs: ReturnType<typeof annualBreakdown>["costs"], service: BillingService, estimated: boolean) {
  return groupedMoney(costs.filter(({ renewal }) => renewal.kind === service).flatMap(({ history, estimatedCost, estimatedCurrency }) =>
    estimated
      ? estimatedCost === null ? [] : [{ amount: Number(estimatedCost), currency: estimatedCurrency }]
      : history.map((payment) => ({ amount: Number(payment.provider_cost), currency: payment.currency })),
  ));
}

function amount(value: number | null | undefined, currency: Currency) {
  return value === null || value === undefined ? "Sin registrar" : money(Number(value), currency);
}

export function AnnualLedger({ renewals, payments, billing, onEdit }: Props) {
  const providerRenewals = renewals.filter((renewal) => renewal.kind === "hosting" || renewal.kind === "domain");
  const providerPayments = payments.filter((payment) => providerRenewals.some((renewal) => renewal.id === payment.renewal_id));
  const years = annualYears(renewals, providerPayments, billing);
  return <div className="annual-ledger">
    <div className="annual-ledger-head">
      <div>
        <h4>Cobros y costos por año</h4>
        <p>El total del cliente suma solo los conceptos que contrató. Los pagos a proveedores se muestran aparte, en su moneda original.</p>
      </div>
      <button className="small-add" onClick={() => onEdit(new Date().getFullYear())}>+ Otro año</button>
    </div>
    {!years.length && <p className="muted-small">Agrega un año para registrar hosting, dominio y/o soporte.</p>}
    {years.map((year) => {
      const charge = billing.find((item) => item.billing_year === year);
      const { costs } = annualBreakdown(year, providerRenewals, providerPayments);
      const currency = charge?.currency ?? "PEN";
      const itemized = itemizedCharge(charge);
      const included = itemized ? billingServices.filter((service) =>
        charge?.[`quoted_${service}`] !== null && charge?.[`quoted_${service}`] !== undefined ||
        charge?.[`charged_${service}`] !== null && charge?.[`charged_${service}`] !== undefined,
      ) : [];
      return <div className="annual-year" key={year}>
        <div className="annual-year-title">
          <div><strong>{year}</strong><span>{charge?.currency ?? "Moneda del cliente por definir"}</span></div>
          <button className="small-add" onClick={() => onEdit(year, charge)}>{charge ? "Editar cobro" : "Registrar cobro"}</button>
        </div>
        {itemized ? <div className="annual-columns">
          <div className="annual-column">
            <h5>Cobro real al cliente</h5>
            {included.map((service) => <div className="annual-service-line" key={service}>
              <span>{serviceNames[service]} cobrado al cliente</span>
              <strong>{amount(charge?.[`charged_${service}`], currency)}</strong>
              {service !== "support" && <small>Pagado al proveedor: {providerMoney(costs, service, false)}</small>}
            </div>)}
            <div className="annual-total"><span>Total recibido del cliente</span><strong>{amount(chargeTotal(charge, "charged"), currency)}</strong></div>
            {charge?.charged_on && <small className="annual-date">Recibido el {prettyDate(charge.charged_on)}</small>}
          </div>
          <div className="annual-column">
            <h5>Presupuesto para el cliente</h5>
            {included.map((service) => <div className="annual-service-line" key={service}>
              <span>{serviceNames[service]} presupuestado al cliente</span>
              <strong>{amount(charge?.[`quoted_${service}`], currency)}</strong>
              {service !== "support" && <small>Costo estimado del proveedor: {providerMoney(costs, service, true)}</small>}
            </div>)}
            <div className="annual-total"><span>Total presupuestado al cliente</span><strong>{amount(chargeTotal(charge, "quoted"), currency)}</strong></div>
          </div>
        </div> : <div className="annual-columns">
          <div className="annual-column">
            <h5>Cobro real al cliente</h5>
            <div className="annual-total"><span>Total recibido del cliente</span><strong>{amount(charge?.charged_total, currency)}</strong></div>
            {costs.map(({ renewal, history }) => <div className="annual-cost" key={renewal.id}><span>Pagado al proveedor de {renewal.label}</span><strong>{groupedMoney(history.map((payment) => ({ amount: Number(payment.provider_cost), currency: payment.currency })))}</strong></div>)}
          </div>
          <div className="annual-column">
            <h5>Presupuesto para el cliente</h5>
            <div className="annual-total"><span>Total presupuestado al cliente</span><strong>{amount(charge?.quoted_total, currency)}</strong></div>
            {costs.map(({ renewal, estimatedCost, estimatedCurrency }) => <div className="annual-cost" key={renewal.id}><span>Costo estimado del proveedor de {renewal.label}</span><strong>{estimatedCost === null ? "Sin registrar" : money(Number(estimatedCost), estimatedCurrency)}</strong></div>)}
          </div>
        </div>}
        {charge && !itemized && <p className="annual-note">Este cobro se guardó sin desglose. Edita el año para separar lo cobrado por hosting, dominio y soporte; no se modificó el total anterior.</p>}
        {charge?.notes && <p className="annual-note">{charge.notes}</p>}
      </div>;
    })}
  </div>;
}
