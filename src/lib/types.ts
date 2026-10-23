export type Currency = "PEN" | "USD";
export type RenewalKind = "hosting" | "domain" | "support" | "other";
export type TransactionKind = "income" | "expense";
export type EventKind = "task" | "deadline" | "meeting";

export interface Client {
  id: string;
  owner_id: string;
  company_name: string;
  legal_name: string | null;
  tax_id: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  industry: string | null;
  notes: string | null;
  created_at: string;
}

export interface Renewal {
  id: string;
  owner_id: string;
  client_id: string;
  kind: RenewalKind;
  label: string;
  due_date: string;
  first_purchased_on: string | null;
  provider_cost: number | null;
  client_price: number;
  currency: Currency;
  billing_months: number;
  notes: string | null;
  created_at: string;
}

export interface RenewalPayment {
  id: string;
  owner_id: string;
  renewal_id: string;
  paid_on: string;
  renewal_due_on: string | null;
  billing_year: number | null;
  provider_cost: number;
  quoted_provider_cost: number | null;
  client_price: number | null;
  currency: Currency;
  notes: string | null;
  created_at: string;
}

export interface AnnualBilling {
  id: string;
  owner_id: string;
  client_id: string;
  billing_year: number;
  currency: Currency;
  quoted_total: number | null;
  charged_total: number | null;
  charged_on: string | null;
  notes: string | null;
  created_at: string;
}

export interface Credential {
  id: string;
  owner_id: string;
  client_id: string;
  service: string;
  login_email: string | null;
  username: string | null;
  login_url: string | null;
  encrypted_password: string | null;
  notes: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  owner_id: string;
  client_id: string | null;
  kind: TransactionKind;
  category: string;
  description: string;
  amount: number;
  currency: Currency;
  occurred_on: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  owner_id: string;
  client_id: string | null;
  kind: EventKind;
  title: string;
  event_date: string;
  remind_days: number;
  notes: string | null;
  completed: boolean;
  created_at: string;
}

export type Data = {
  clients: Client[];
  renewals: Renewal[];
  renewalPayments: RenewalPayment[];
  annualBilling: AnnualBilling[];
  credentials: Credential[];
  transactions: Transaction[];
  events: CalendarEvent[];
};
