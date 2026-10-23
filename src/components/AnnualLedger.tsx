import { annualBreakdown, annualYears } from "../lib/annual";
import { money, prettyDate } from "../lib/dates";
import type { AnnualBilling, Currency, Renewal, RenewalPayment } from "../lib/types";

type Props = {
  renewals: Renewal[];
  payments: RenewalPayment[];
  billing: AnnualBilling[];
  onEdit: (year: number, item?: AnnualBilling) => void;
};

function paidAmounts(payments: RenewalPayment[]) {
  const totals = new Map<Currency, number>();
  for (const payment of payments) {
    totals.set(payment.currency, (totals.get(payment.currency) ?? 0) + Number(payment.provider_cost));
  }
  return [...totals].map(([currency, amount]) => money(amount, currency)).join(" · ");
}

function SupportValue({ result, estimated = false }: { result: ReturnType<typeof annualBreakdown>["actualSupport"]; estimated?: boolean }) {
  if (result.reason === "ready") return <strong>{money(result.amount, result.currency)}</strong>;
  if (result.reason === "currency") return <em>Sin calcular: hay costos en USD y PEN</em>;
  if (result.reason === "total") return <em>{estimated ? "Registra la cotización al cliente" : "Registra el total del cliente"}</em>;
  return <em>{estimated ? "Completa los costos estimados" : "Completa los pagos a proveedores"}</em>;
}

export function AnnualLedger({ renewals, payments, billing, onEdit }: Props) {
  const packageRenewals = renewals.filter((renewal) => renewal.kind === "hosting" || renewal.kind === "domain");
  const packagePayments = payments.filter((payment) => packageRenewals.some((renewal) => renewal.id === payment.renewal_id));
  const years = annualYears(packageRenewals, packagePayments, billing);
  return <div className="annual-ledger">
    <div className="annual-ledger-head">
      <div>
        <h4>Balance del paquete por año</h4>
        <p>El total cobrado incluye hosting, dominio y tu soporte. Cada proveedor se registra por separado.</p>
      </div>
      <button className="small-add" onClick={() => onEdit(new Date().getFullYear())}>+ Otro año</button>
    </div>
    {!years.length && <p className="muted-small">Agrega servicios o registra un año para ver el balance.</p>}
    {years.map((year) => {
      const charge = billing.find((item) => item.billing_year === year);
      const { costs, actualSupport, estimatedSupport } = annualBreakdown(year, packageRenewals, packagePayments, charge);
      const currency = charge?.currency ?? "PEN";
      return <div className="annual-year" key={year}>
        <div className="annual-year-title">
          <div><strong>{year}</strong><span>{charge?.currency ?? "Moneda del cliente por definir"}</span></div>
          <button className="small-add" onClick={() => onEdit(year, charge)}>{charge ? "Editar cobro" : "Registrar cobro"}</button>
        </div>
        <div className="annual-columns">
          <div className="annual-column">
            <h5>Importes reales</h5>
            <div className="annual-total"><span>Total cobrado al cliente</span><strong>{charge?.charged_total === null || charge?.charged_total === undefined ? "Sin registrar" : money(Number(charge.charged_total), currency)}</strong></div>
            {charge?.charged_on && <small className="annual-date">Cobrado el {prettyDate(charge.charged_on)}</small>}
            {costs.map(({ renewal, history }) => <div className="annual-cost" key={renewal.id}>
              <span>Pagado a {renewal.label}</span>
              <strong>{history.length ? paidAmounts(history) : "Sin registrar"}</strong>
            </div>)}
            <div className="annual-support"><span>Tu ingreso por soporte</span><SupportValue result={actualSupport} /></div>
          </div>
          <div className="annual-column">
            <h5>Importes estimados / cotizados</h5>
            <div className="annual-total"><span>Total aproximado indicado al cliente</span><strong>{charge?.quoted_total === null || charge?.quoted_total === undefined ? "Sin registrar" : money(Number(charge.quoted_total), currency)}</strong></div>
            {costs.map(({ renewal, estimatedCost, estimatedCurrency }) => <div className="annual-cost" key={renewal.id}>
              <span>Estimado de {renewal.label}</span>
              <strong>{estimatedCost === null ? "Sin estimar" : money(Number(estimatedCost), estimatedCurrency)}</strong>
            </div>)}
            <div className="annual-support"><span>Soporte estimado</span><SupportValue result={estimatedSupport} estimated /></div>
          </div>
        </div>
        {charge?.notes && <p className="annual-note">{charge.notes}</p>}
      </div>;
    })}
  </div>;
}
