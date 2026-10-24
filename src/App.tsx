import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MoreHorizontal,
  Pencil,
  ImagePlus,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { configured, passwordLinkPending, supabase } from "./lib/supabase";
import {
  daysUntil,
  money,
  monthLabel,
  parseDay,
  prettyDate,
  today,
} from "./lib/dates";
import { decryptSecret, encryptSecret } from "./lib/vault";
import type {
  AnnualBilling,
  AnnualCostBreakdown,
  AnnualProviderCost,
  CalendarEvent,
  Client,
  Credential,
  Currency,
  Data,
  EventKind,
  Renewal,
  RenewalKind,
  RenewalPayment,
  Transaction,
} from "./lib/types";
import { AnnualLedger } from "./components/AnnualLedger";
import { annualBreakdown, billingServices, calculateSupport, chargeTotal, itemizedCharge, type BillingService } from "./lib/annual";
import { credentialPriority } from "./lib/credentials";

type View = "overview" | "clients" | "payments" | "finances" | "calendar";
const LOGIN_ALIAS = "datnya.monzon";
const LOGIN_EMAIL = "datnyamonzon1@gmail.com";
type Editor = {
  kind: "client" | "renewal" | "credential" | "transaction" | "event" | "vault" | "paid" | "pastPayment" | "annualBilling";
  item?: Client | Renewal | Credential | Transaction | CalendarEvent | AnnualBilling;
  clientId?: string;
  renewalId?: string;
  billingYear?: number;
} | null;

const emptyData: Data = {
  clients: [],
  renewals: [],
  renewalPayments: [],
  annualBilling: [],
  credentials: [],
  transactions: [],
  events: [],
};
function BrandMark() {
  return <img className="brand-mark" src="/favicon.svg" alt="Zorro naranja" />;
}
function LoginVisual() {
  return <div className="login-intro" aria-hidden="true" />;
}
const offsetDate = (days: number) => {
  const d = parseDay(today());
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const demoOwner = "vista-previa";
const demoData: Data = {
  clients: [
    {
      id: "demo-1",
      owner_id: demoOwner,
      company_name: "Estudio Aurora",
      legal_name: "Estudio Aurora S.A.C.",
      tax_id: "—",
      contact_name: "María Torres",
      phone: "+51 999 000 000",
      email: "contacto@ejemplo.com",
      website: "https://example.com",
      industry: "Diseño y creatividad",
      notes: "Datos de ejemplo para explorar la interfaz.",
      created_at: today(),
    },
    {
      id: "demo-2",
      owner_id: demoOwner,
      company_name: "Norte Digital",
      legal_name: "Norte Digital S.A.C.",
      tax_id: "—",
      contact_name: "Luis Ramírez",
      phone: "+51 988 000 000",
      email: "hola@ejemplo.org",
      website: "https://example.org",
      industry: "Tecnología",
      notes: null,
      created_at: today(),
    },
  ],
  renewals: [
    {
      id: "r1",
      owner_id: demoOwner,
      client_id: "demo-1",
      kind: "hosting",
      label: "Hosting principal",
      due_date: offsetDate(18),
      first_purchased_on: offsetDate(-347),
      provider_cost: 280,
      client_price: 450,
      currency: "PEN",
      billing_months: 12,
      notes: "Renovación con el proveedor de hosting; confirmar precio antes de avisar al cliente.",
      created_at: today(),
    },
    {
      id: "r2",
      owner_id: demoOwner,
      client_id: "demo-1",
      kind: "domain",
      label: "Dominio .com",
      due_date: offsetDate(47),
      first_purchased_on: offsetDate(-318),
      provider_cost: 65,
      client_price: 100,
      currency: "PEN",
      billing_months: 12,
      notes: null,
      created_at: today(),
    },
    {
      id: "r3",
      owner_id: demoOwner,
      client_id: "demo-2",
      kind: "support",
      label: "Soporte anual",
      due_date: offsetDate(94),
      first_purchased_on: null,
      provider_cost: 0,
      client_price: 600,
      currency: "PEN",
      billing_months: 12,
      notes: null,
      created_at: today(),
    },
  ],
  renewalPayments: [
    {
      id: "payment-demo-1",
      owner_id: demoOwner,
      renewal_id: "r1",
      paid_on: offsetDate(-347),
      renewal_due_on: offsetDate(-347),
      billing_year: parseDay(today()).getFullYear() - 1,
      provider_cost: 120,
      quoted_provider_cost: null,
      client_price: null,
      currency: "PEN",
      notes: "Precio promocional del primer año.",
      created_at: today(),
    },
    {
      id: "payment-demo-2",
      owner_id: demoOwner,
      renewal_id: "r2",
      paid_on: offsetDate(-318),
      renewal_due_on: offsetDate(-318),
      billing_year: parseDay(today()).getFullYear() - 1,
      provider_cost: 30,
      quoted_provider_cost: null,
      client_price: null,
      currency: "PEN",
      notes: null,
      created_at: today(),
    },
  ],
  annualBilling: [
    {
      id: "annual-demo-1",
      owner_id: demoOwner,
      client_id: "demo-1",
      billing_year: parseDay(today()).getFullYear() - 1,
      currency: "PEN",
      quoted_total: 200,
      charged_total: 200,
      quoted_hosting: 120,
      quoted_domain: 30,
      quoted_support: 50,
      charged_hosting: 120,
      charged_domain: 30,
      charged_support: 50,
      cost_breakdown: {
        version: 2,
        hosting: { currency: "PEN", estimated: 120, paid: 120, estimated_client_currency: null, paid_client_currency: null },
        domain: { currency: "PEN", estimated: 30, paid: 30, estimated_client_currency: null, paid_client_currency: null },
        support: true,
      },
      charged_on: offsetDate(-347),
      notes: "Primer año con precios promocionales.",
      created_at: today(),
    },
  ],
  credentials: [
    {
      id: "c1",
      owner_id: demoOwner,
      client_id: "demo-1",
      service: "cPanel",
      login_email: null,
      username: "usuario-ejemplo",
      login_url: "https://example.com/cpanel",
      encrypted_password: null,
      notes: "Ejemplo sin contraseña",
      created_at: today(),
    },
  ],
  transactions: [
    {
      id: "t1",
      owner_id: demoOwner,
      client_id: "demo-1",
      kind: "income",
      category: "Página web",
      description: "Diseño web corporativo",
      amount: 1800,
      currency: "PEN",
      occurred_on: offsetDate(-6),
      created_at: today(),
    },
    {
      id: "t2",
      owner_id: demoOwner,
      client_id: null,
      kind: "expense",
      category: "Herramientas",
      description: "Suscripción de diseño",
      amount: 75,
      currency: "PEN",
      occurred_on: offsetDate(-9),
      created_at: today(),
    },
  ],
  events: [
    {
      id: "e1",
      owner_id: demoOwner,
      client_id: "demo-2",
      kind: "deadline",
      title: "Entrega de propuesta",
      event_date: offsetDate(6),
      remind_days: 7,
      notes: "Revisar y enviar versión final.",
      completed: false,
      created_at: today(),
    },
  ],
};

const nav: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Resumen", icon: LayoutDashboard },
  { id: "clients", label: "Clientes", icon: UsersRound },
  { id: "payments", label: "Vencimientos", icon: CreditCard },
  { id: "finances", label: "Finanzas", icon: Wallet },
  { id: "calendar", label: "Calendario", icon: CalendarDays },
];
const titleByView: Record<View, string> = {
  overview: "Tu espacio de trabajo",
  clients: "Clientes",
  payments: "Vencimientos",
  finances: "Finanzas",
  calendar: "Calendario",
};
const kindLabel: Record<RenewalKind, string> = {
  hosting: "Hosting",
  domain: "Dominio",
  support: "Soporte",
  other: "Otro servicio",
};
const eventLabel: Record<EventKind, string> = {
  task: "Tarea",
  deadline: "Entrega",
  meeting: "Reunión",
};
const fromForm = (form: HTMLFormElement, name: string) =>
  String(new FormData(form).get(name) ?? "").trim();
const rawFromForm = (form: HTMLFormElement, name: string) =>
  String(new FormData(form).get(name) ?? "");
const optional = (value: string) => value || null;
const isUrl = (value: string) => !value || /^(https?:\/\/|www\.)/i.test(value);
const hrefFor = (value: string) => /^www\./i.test(value) ? `https://${value}` : value;
const industries = ["Tecnología", "Comercio", "Gastronomía", "Salud", "Educación", "Construcción", "Inmobiliaria", "Turismo", "Servicios profesionales", "Finanzas", "Transporte y logística", "Manufactura", "Agricultura", "Belleza y bienestar", "Diseño y creatividad", "Entretenimiento", "Organización sin fines de lucro"];
const getClient = (data: Data, id: string | null) =>
  data.clients.find((client) => client.id === id);
const statusOf = (date: string, remindDays = 30) => {
  const days = daysUntil(date);
  if (days < 0)
    return { label: `Vencido hace ${Math.abs(days)} d`, className: "danger" };
  if (days === 0) return { label: "Vence hoy", className: "danger" };
  if (days <= remindDays)
    return { label: `En ${days} días`, className: "warning" };
  return { label: `En ${days} días`, className: "neutral" };
};

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Empty({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: typeof UsersRound;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={24} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [settingPassword, setSettingPassword] = useState(passwordLinkPending);
  const [authReady, setAuthReady] = useState(!configured);
  const [data, setData] = useState<Data>(configured ? emptyData : demoData);
  const [view, setView] = useState<View>("overview");
  const [editor, setEditor] = useState<Editor>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [calendarMode, setCalendarMode] = useState<"month" | "year">("month");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [vaultVerifier, setVaultVerifier] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: result }) => {
      setSession(result.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setSession(nextSession);
        if (event === "PASSWORD_RECOVERY") setSettingPassword(true);
        if (!nextSession) {
          setData(emptyData);
          setPassphrase("");
          setRevealed({});
          setAvatar(null);
          setProfileOpen(false);
          setSelectedClientId(null);
          setEditor(null);
        }
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadData() {
    if (!supabase || !session) return;
    const [clients, renewals, renewalPayments, annualBilling, credentials, transactions, events, vault, profile] =
      await Promise.all([
        supabase.from("clients").select("*").order("company_name"),
        supabase.from("renewals").select("*").order("due_date"),
        supabase.from("renewal_payments").select("*").order("paid_on", { ascending: false }),
        supabase.from("client_annual_billing").select("*").order("billing_year", { ascending: false }),
        supabase.from("credentials").select("*").order("service"),
        supabase
          .from("transactions")
          .select("*")
          .order("occurred_on", { ascending: false }),
        supabase.from("calendar_events").select("*").order("event_date"),
        supabase.from("vault_settings").select("verifier").maybeSingle(),
        supabase.from("user_profiles").select("avatar_data").maybeSingle(),
      ]);
    const error = [
      clients,
      renewals,
      renewalPayments,
      annualBilling,
      credentials,
      transactions,
      events,
      vault,
      profile,
    ].find((result) => result.error)?.error;
    if (error) {
      setToast(`No se pudieron cargar los datos: ${error.message}`);
      return;
    }
    setData({
      clients: clients.data as Client[],
      renewals: renewals.data as Renewal[],
      renewalPayments: renewalPayments.data as RenewalPayment[],
      annualBilling: annualBilling.data as AnnualBilling[],
      credentials: credentials.data as Credential[],
      transactions: transactions.data as Transaction[],
      events: events.data as CalendarEvent[],
    });
    setVaultVerifier(vault.data?.verifier ?? null);
    setAvatar(profile.data?.avatar_data ?? null);
  }

  async function saveAvatar(value: string | null) {
    if (!supabase || !session) {
      setAvatar(value);
      setProfileOpen(false);
      setToast(value ? "Foto actualizada en la vista previa." : "Foto eliminada de la vista previa.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("user_profiles").upsert({
      owner_id: session.user.id,
      avatar_data: value,
    });
    setBusy(false);
    if (error) {
      setToast(`No se pudo guardar la foto: ${error.message}`);
      return;
    }
    setAvatar(value);
    setProfileOpen(false);
    setToast(value ? "Foto de perfil actualizada." : "Foto de perfil eliminada.");
  }

  async function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setToast("Elige una imagen de hasta 10 MB.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas no disponible");
      const side = Math.min(bitmap.width, bitmap.height);
      context.drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        0,
        0,
        256,
        256,
      );
      bitmap.close();
      await saveAvatar(canvas.toDataURL("image/webp", 0.85));
    } catch {
      setToast("No se pudo abrir esa imagen. Prueba con JPG, PNG o WebP.");
    }
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast(`Copiado al portapapeles: ${label}.`);
    } catch {
      setToast("No se pudo copiar. Revisa el permiso del portapapeles.");
    }
  }

  async function copyPassword(credential: Credential) {
    if (!configured) {
      await copyText("clave-de-ejemplo", "Contraseña de ejemplo");
      return;
    }
    if (!credential.encrypted_password) {
      setToast("No hay una contraseña guardada.");
      return;
    }
    if (!passphrase) {
      setEditor({ kind: "vault" });
      setToast("Desbloquea la caja fuerte para copiar la contraseña.");
      return;
    }
    try {
      const password = await decryptSecret(credential.encrypted_password, passphrase);
      await copyText(password, "Contraseña");
    } catch {
      setToast("No se pudo copiar la contraseña. Revisa la clave maestra.");
    }
  }

  async function signOut() {
    if (!supabase || !session) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setBusy(false);
    if (error) {
      setToast(`No se pudo cerrar sesión: ${error.message}`);
      return;
    }
    setSession(null);
    setData(emptyData);
    setPassphrase("");
    setRevealed({});
    setAvatar(null);
    setProfileOpen(false);
    setSelectedClientId(null);
    setEditor(null);
  }

  useEffect(() => {
    if (session) void loadData();
  }, [session?.user.id]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 5500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const renewalsSorted = useMemo(
    () =>
      [...data.renewals].sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [data.renewals],
  );
  const alerts = useMemo(
    () =>
      [
        ...data.renewals
          .filter((r) => daysUntil(r.due_date) <= 30)
          .map((r) => ({
            id: r.id,
            date: r.due_date,
            title: `${kindLabel[r.kind]} · ${getClient(data, r.client_id)?.company_name ?? "Cliente"}`,
            type: "renewal" as const,
            days: daysUntil(r.due_date),
          })),
        ...data.events
          .filter(
            (e) => !e.completed && daysUntil(e.event_date) <= e.remind_days,
          )
          .map((e) => ({
            id: e.id,
            date: e.event_date,
            title: e.title,
            type: "event" as const,
            days: daysUntil(e.event_date),
          })),
      ].sort((a, b) => a.date.localeCompare(b.date)),
    [data],
  );
  const currentYear = new Date().getFullYear();
  const chargedThisYear = (currency: Currency) => data.annualBilling
    .filter((item) => Number((item.charged_on ?? `${item.billing_year}-01-01`).slice(0, 4)) === currentYear && item.currency === currency)
    .reduce((sum, item) => sum + Number(chargeTotal(item, "charged") ?? 0), 0);
  const providerPaidThisYear = (currency: Currency) => data.renewalPayments
    .filter((payment) => Number(payment.paid_on.slice(0, 4)) === currentYear && payment.currency === currency)
    .reduce((sum, payment) => sum + Number(payment.provider_cost), 0);
  const hasUsd = data.annualBilling.some((item) => item.currency === "USD") || data.renewalPayments.some((item) => item.currency === "USD");
  const selectedClient = getClient(data, selectedClientId);
  const selectedRenewals = data.renewals.filter(
    (renewal) => renewal.client_id === selectedClientId,
  );

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = event.currentTarget;
    const identity = fromForm(form, "identity").toLowerCase();
    if (identity !== LOGIN_ALIAS && identity !== LOGIN_EMAIL) {
      setToast("Revisa el usuario o correo y la contraseña.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: LOGIN_EMAIL,
      password: rawFromForm(form, "password"),
    });
    setBusy(false);
    if (error)
      setToast("No se pudo iniciar sesión. Revisa el correo y la contraseña.");
  }

  async function sendPasswordLink() {
    if (!supabase) return;
    const form = document.querySelector<HTMLFormElement>("#login-form");
    if (!form) return;
    const identity = fromForm(form, "identity").toLowerCase();
    if (identity !== LOGIN_ALIAS && identity !== LOGIN_EMAIL) {
      setToast("Escribe primero tu usuario o correo para recibir el enlace.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(LOGIN_EMAIL);
    setBusy(false);
    if (error) {
      setToast("No pudimos enviar el enlace. Espera unos minutos e inténtalo de nuevo.");
      return;
    }
    setRecoverySent(true);
  }

  async function setAccountPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = event.currentTarget;
    const password = rawFromForm(form, "password");
    const confirmation = rawFromForm(form, "confirmation");
    if (password.length < 8) {
      setToast("Usa una contraseña de al menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setToast("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setToast("No se pudo guardar la contraseña. Prueba de nuevo.");
      return;
    }
    setSettingPassword(false);
    setToast("Contraseña configurada. Ya puedes usar tu panel.");
    window.history.replaceState({}, "", window.location.pathname);
  }

  async function save(
    table:
      | "clients"
      | "renewals"
      | "credentials"
      | "transactions"
      | "calendar_events"
      | "renewal_payments"
      | "client_annual_billing",
    values: Record<string, unknown>,
    id?: string,
  ) {
    if (!supabase || !session) {
      setToast("Vista previa: conecta Supabase para guardar tus datos.");
      return false;
    }
    setBusy(true);
    const payload = { ...values, owner_id: session.user.id };
    const result = id
      ? await supabase.from(table).update(payload).eq("id", id)
      : await supabase.from(table).insert(payload);
    setBusy(false);
    if (result.error) {
      setToast(`No se pudo guardar: ${result.error.message}`);
      return false;
    }
    await loadData();
    setEditor(null);
    setToast("Guardado correctamente");
    return true;
  }

  async function remove(
    table:
      | "clients"
      | "renewals"
      | "credentials"
      | "transactions"
      | "calendar_events"
      | "client_annual_billing",
    id: string,
    label: string,
  ) {
    if (!supabase || !session) {
      setToast("Vista previa: conecta Supabase para editar.");
      return false;
    }
    if (
      !window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)
    )
      return false;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      setToast(`No se pudo eliminar: ${error.message}`);
      return false;
    }
    if (table === "clients") setSelectedClientId(null);
    await loadData();
    setToast("Eliminado");
    return true;
  }

  function markPaid(renewal: Renewal) {
    setEditor({ kind: "paid", item: renewal });
  }

  async function unlockVault(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session) {
      setToast("Conecta Supabase para usar la caja fuerte.");
      return;
    }
    const entered = rawFromForm(event.currentTarget, "passphrase");
    if (entered.length < 12) {
      setToast("Usa una clave maestra de al menos 12 caracteres.");
      return;
    }
    try {
      if (vaultVerifier) {
        if ((await decryptSecret(vaultVerifier, entered)) !== "gestor-vault-v1")
          throw new Error("Clave incorrecta");
      } else {
        const verifier = await encryptSecret("gestor-vault-v1", entered);
        const { error } = await supabase
          .from("vault_settings")
          .insert({ owner_id: session.user.id, verifier });
        if (error) throw error;
        setVaultVerifier(verifier);
      }
      setPassphrase(entered);
      setEditor(null);
      setToast("Caja fuerte desbloqueada");
    } catch {
      setToast("La clave maestra es incorrecta o no se pudo configurar.");
    }
  }

  async function reveal(credential: Credential) {
    if (revealed[credential.id]) {
      setRevealed((current) => {
        const next = { ...current };
        delete next[credential.id];
        return next;
      });
      return;
    }
    if (!configured) {
      setRevealed((current) => ({ ...current, [credential.id]: "clave-de-ejemplo" }));
      return;
    }
    if (!passphrase) {
      setEditor({ kind: "vault" });
      return;
    }
    if (!credential.encrypted_password) {
      setToast("No hay una contraseña guardada.");
      return;
    }
    try {
      const plaintext = await decryptSecret(
        credential.encrypted_password,
        passphrase,
      );
      setRevealed((current) => ({ ...current, [credential.id]: plaintext }));
      window.setTimeout(
        () =>
          setRevealed((current) => {
            const next = { ...current };
            delete next[credential.id];
            return next;
          }),
        20_000,
      );
    } catch {
      setPassphrase("");
      setToast("No se pudo abrir esta contraseña. Comprueba la clave maestra.");
      setEditor({ kind: "vault" });
    }
  }

  async function submitEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || editor.kind === "vault") return;
    const form = event.currentTarget;
    const id = editor.item?.id;
    const clientId = fromForm(form, "client_id");
    if (editor.kind === "client") {
      const website = fromForm(form, "website");
      if (!isUrl(website)) {
        setToast("El sitio web debe comenzar con www., https:// o http://");
        return;
      }
      const industry = fromForm(form, "industry");
      const customIndustry = fromForm(form, "industry_other");
      if (industry === "other" && !customIndustry) {
        setToast("Escribe el rubro de la empresa.");
        return;
      }
      await save(
        "clients",
        {
          company_name: fromForm(form, "company_name"),
          legal_name: optional(fromForm(form, "legal_name")),
          tax_id: optional(fromForm(form, "tax_id")),
          contact_name: optional(fromForm(form, "contact_name")),
          phone: optional(fromForm(form, "phone")),
          email: optional(fromForm(form, "email")),
          website: optional(website),
          industry: optional(industry === "other" ? customIndustry : industry),
          notes: optional(fromForm(form, "notes")),
        },
        id,
      );
    } else if (editor.kind === "renewal") {
      await save(
        "renewals",
        {
          client_id: clientId,
          kind: fromForm(form, "kind"),
          label: fromForm(form, "label"),
          due_date: fromForm(form, "due_date"),
          first_purchased_on: optional(fromForm(form, "first_purchased_on")),
          provider_cost: fromForm(form, "provider_cost") ? Number(fromForm(form, "provider_cost")) : null,
          client_price: (editor.item as Renewal | undefined)?.client_price ?? 0,
          currency: fromForm(form, "currency"),
          billing_months: Number(fromForm(form, "billing_months")),
          notes: optional(fromForm(form, "notes")),
        },
        id,
      );
    } else if (editor.kind === "paid") {
      if (!supabase || !session) {
        setToast("Conecta Supabase para registrar pagos.");
        return;
      }
      const renewal = editor.item as Renewal;
      setBusy(true);
      const { error } = await supabase.rpc("record_renewal_payment", {
        p_renewal_id: renewal.id,
        p_expected_due_on: renewal.due_date,
        p_paid_on: fromForm(form, "paid_on"),
        p_provider_cost: Number(fromForm(form, "provider_cost")),
        p_client_price: null,
        p_next_provider_cost: fromForm(form, "next_provider_cost") ? Number(fromForm(form, "next_provider_cost")) : null,
        p_notes: optional(fromForm(form, "notes")),
      });
      setBusy(false);
      if (error) {
        setToast(`No se pudo registrar el pago: ${error.message}`);
        return;
      }
      await loadData();
      setEditor(null);
      setToast("Pago guardado en el historial y próximo vencimiento actualizado.");
    } else if (editor.kind === "pastPayment") {
      const renewal = data.renewals.find((r) => r.id === editor.renewalId);
      if (!renewal) return;
      await save("renewal_payments", {
        renewal_id: renewal.id,
        paid_on: fromForm(form, "paid_on"),
        renewal_due_on: null,
        billing_year: fromForm(form, "billing_year") ? Number(fromForm(form, "billing_year")) : Number(fromForm(form, "paid_on").slice(0, 4)),
        provider_cost: Number(fromForm(form, "provider_cost")),
        quoted_provider_cost: fromForm(form, "quoted_provider_cost") ? Number(fromForm(form, "quoted_provider_cost")) : null,
        client_price: null,
        currency: renewal.currency,
        notes: optional(fromForm(form, "notes")),
      });
    } else if (editor.kind === "annualBilling") {
      const year = Number(fromForm(form, "billing_year"));
      const formData = new FormData(form);
      const selected = billingServices.filter((service) => formData.has(`include_${service}`));
      if (!selected.length) {
        const previous = editor.item as AnnualBilling | undefined;
        if (!previous || previous.cost_breakdown || itemizedCharge(previous)) {
          setToast("Selecciona al menos un servicio: hosting, dominio o soporte.");
          return;
        }
        await save("client_annual_billing", {
          billing_year: year,
          currency: fromForm(form, "currency"),
          charged_on: optional(fromForm(form, "charged_on")),
          notes: optional(fromForm(form, "notes")),
        }, previous.id);
        return;
      }
      const inputAmount = (name: string) => {
        const raw = fromForm(form, name);
        return raw === "" ? null : Number(raw);
      };
      const chargedTotal = inputAmount("charged_total");
      if (chargedTotal === null) {
        setToast("Ingresa el total que te pagó el cliente.");
        return;
      }
      const clientCurrency = fromForm(form, "currency") as Currency;
      const providerCost = (service: "hosting" | "domain"): AnnualProviderCost | null => {
        if (!selected.includes(service)) return null;
        const providerCurrency = fromForm(form, `${service}_currency`) as Currency;
        const previous = (editor.item as AnnualBilling | undefined)?.cost_breakdown?.[service];
        const keepPreviousEstimate = previous?.currency === providerCurrency;
        return {
          currency: providerCurrency,
          estimated: keepPreviousEstimate ? previous.estimated : null,
          paid: inputAmount(`${service}_paid`),
          estimated_client_currency: keepPreviousEstimate ? previous.estimated_client_currency : null,
          paid_client_currency: providerCurrency === clientCurrency ? null : inputAmount(`${service}_paid_client_currency`),
        };
      };
      const breakdown: AnnualCostBreakdown = {
        version: 2,
        hosting: providerCost("hosting"),
        domain: providerCost("domain"),
        support: selected.includes("support"),
      };
      for (const service of ["hosting", "domain"] as const) {
        const cost = breakdown[service];
        if (!cost || cost.currency === clientCurrency) continue;
        if (cost.paid_client_currency !== null && cost.paid === null) {
          setToast(`En ${service === "hosting" ? "hosting" : "dominio"}, ingresa el costo original antes de su equivalente en ${clientCurrency}.`);
          return;
        }
      }
      await save("client_annual_billing", {
        client_id: editor.clientId ?? (editor.item as AnnualBilling).client_id,
        billing_year: year,
        currency: clientCurrency,
        charged_total: chargedTotal,
        cost_breakdown: breakdown,
        charged_on: optional(fromForm(form, "charged_on")),
        notes: optional(fromForm(form, "notes")),
      }, id);
    } else if (editor.kind === "credential") {
      const loginUrl = fromForm(form, "login_url");
      if (!isUrl(loginUrl)) {
        setToast("El enlace de acceso debe comenzar con https://");
        return;
      }
      const password = rawFromForm(form, "password");
      if (password && !passphrase) {
        setToast("Desbloquea la caja fuerte antes de guardar una contraseña.");
        return;
      }
      const encrypted = password
        ? await encryptSecret(password, passphrase)
        : ((editor.item as Credential | undefined)?.encrypted_password ?? null);
      const service = fromForm(form, "service");
      const customService = fromForm(form, "service_other");
      if (service === "other" && !customService) {
        setToast("Escribe el nombre del otro tipo de acceso.");
        return;
      }
      await save(
        "credentials",
        {
          client_id: clientId,
          service: service === "other" ? customService : service,
          login_email: optional(fromForm(form, "login_email")),
          username: optional(fromForm(form, "username")),
          login_url: optional(loginUrl),
          encrypted_password: encrypted,
          notes: optional(fromForm(form, "notes")),
        },
        id,
      );
    } else if (editor.kind === "transaction") {
      await save(
        "transactions",
        {
          client_id: optional(clientId),
          kind: fromForm(form, "kind"),
          category: fromForm(form, "category"),
          description: fromForm(form, "description"),
          amount: Number(fromForm(form, "amount")),
          currency: fromForm(form, "currency"),
          occurred_on: fromForm(form, "occurred_on"),
        },
        id,
      );
    } else if (editor.kind === "event") {
      await save(
        "calendar_events",
        {
          client_id: optional(clientId),
          kind: fromForm(form, "kind"),
          title: fromForm(form, "title"),
          event_date: fromForm(form, "event_date"),
          remind_days: Number(fromForm(form, "remind_days")),
          notes: optional(fromForm(form, "notes")),
          completed:
            (form.elements.namedItem("completed") as HTMLInputElement)
              ?.checked ?? false,
        },
        id,
      );
    }
  }

  async function toggleEvent(event: CalendarEvent) {
    await save("calendar_events", { completed: !event.completed }, event.id);
  }

  async function deleteEditorItem() {
    if (!editor || editor.kind === "vault" || editor.kind === "paid" || editor.kind === "pastPayment" || !editor.item?.id) return;
    const tables = {
      client: "clients",
      renewal: "renewals",
      credential: "credentials",
      transaction: "transactions",
      event: "calendar_events",
      annualBilling: "client_annual_billing",
    } as const;
    if (
      await remove(
        tables[editor.kind],
        editor.item.id,
        editor.kind === "credential" ? "este acceso" : "este registro",
      )
    )
      setEditor(null);
  }

  function openView(next: View) {
    setView(next);
    setMobileOpen(false);
    setProfileOpen(false);
    setSelectedClientId(null);
  }
  function shiftMonth(direction: number) {
    const d = new Date(year, month + direction, 1);
    setMonth(d.getMonth());
    setYear(d.getFullYear());
  }

  if (!configured && !import.meta.env.DEV)
    return (
      <div className="loading-screen">
        <BrandMark />
        <p>La aplicación aún no está configurada.</p>
      </div>
    );
  if (!authReady)
    return (
      <div className="loading-screen">
        <BrandMark />
        <p>Cargando tu espacio…</p>
      </div>
    );
  if (configured && session && settingPassword)
    return (
      <div className="login-shell">
        <div className="auth-window">
          <LoginVisual />
          <div className="login-card">
            <span className="eyebrow">CONFIGURAR ACCESO</span>
            <h2>Elige tu contraseña</h2>
            <p>Usa al menos 8 caracteres y guárdala en un lugar seguro.</p>
            <form onSubmit={setAccountPassword}>
              <label>
                Nueva contraseña
                <input name="password" type="password" minLength={8} required autoComplete="new-password" />
              </label>
              <label>
                Repetir contraseña
                <input name="confirmation" type="password" minLength={8} required autoComplete="new-password" />
              </label>
              <button className="button primary full" disabled={busy}>
                {busy ? "Guardando…" : "Guardar contraseña"} <ArrowRight size={17} />
              </button>
            </form>
          </div>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  if (configured && !session)
    return (
      <div className="login-shell">
        <div className="auth-window">
          <LoginVisual />
          <div className="login-card">
            <span className="eyebrow">ACCESO PERSONAL</span>
            <h2>Bienvenida de nuevo.</h2>
            <p>Ingresa a tu espacio de trabajo.</p>
            <form id="login-form" onSubmit={signIn} autoComplete="off">
              <label>
                Usuario o correo
                <input
                  name="identity"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Tu usuario o correo electrónico"
                  spellCheck={false}
                />
              </label>
              <label>
                Contraseña
                <span className="login-password-field">
                  <input
                    name="password"
                    type={showLoginPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Ingresa tu contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((shown) => !shown)}
                    aria-label={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    title={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showLoginPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </span>
              </label>
              <button className="button primary full" disabled={busy}>
                {busy ? "Ingresando…" : "Ingresar"} <ArrowRight size={18} />
              </button>
            </form>
            <button
              className="login-recovery-button"
              type="button"
              onClick={sendPasswordLink}
              disabled={busy}
            >
              Configurar o recuperar contraseña
            </button>
            {recoverySent && (
              <p className="login-recovery-note" role="status">
                Revisa tu correo. Abre el enlace más reciente para definir una contraseña nueva.
              </p>
            )}
            <span className="login-foot"><ShieldCheck size={16} /> Acceso privado para tu cuenta.</span>
          </div>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </div>
    );

  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="mobile-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand">
            <BrandMark />
            <div>
              <strong>Gestión</strong>
              <span>de clientes</span>
            </div>
          </div>
          <button
            className="icon-button mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>
        <span className="nav-caption">ESPACIO DE TRABAJO</span>
        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => openView(item.id)}
            >
              <item.icon size={19} strokeWidth={1.8} />
              {item.label}
              {item.id === "payments" &&
                alerts.filter((a) => a.type === "renewal").length > 0 && (
                  <span className="nav-count">
                    {alerts.filter((a) => a.type === "renewal").length}
                  </span>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-security">
            <LockKeyhole size={17} />
            <div>
              <strong>Caja fuerte</strong>
              <span>{passphrase ? "Desbloqueada" : "Bloqueada"}</span>
            </div>
            <button
              className="text-icon"
              onClick={() =>
                passphrase
                  ? (setPassphrase(""),
                    setRevealed({}),
                    setToast("Caja fuerte bloqueada"))
                  : setEditor({ kind: "vault" })
              }
            >
              {passphrase ? "Bloquear" : "Abrir"}
            </button>
          </div>
          <div className="profile-area">
            <div className="sidebar-profile">
              <button
                className="avatar"
                title="Cambiar foto de perfil"
                aria-label="Opciones de foto de perfil"
                onClick={() => setProfileOpen((open) => !open)}
              >
                {avatar ? (
                  <img src={avatar} alt="Foto de perfil" />
                ) : (
                  <ImagePlus size={17} />
                )}
              </button>
              <div>
                <strong>Mi espacio</strong>
                <span>{session?.user.email ?? "Vista previa"}</span>
              </div>
            </div>
            {profileOpen && (
              <div className="profile-menu">
                <button onClick={() => avatarInput.current?.click()}>
                  <ImagePlus size={15} /> {avatar ? "Cambiar foto" : "Subir foto"}
                </button>
                {avatar && (
                  <button onClick={() => void saveAvatar(null)} disabled={busy}>
                    <Trash2 size={15} /> Eliminar foto
                  </button>
                )}
              </div>
            )}
            <input
              ref={avatarInput}
              className="visually-hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => void chooseAvatar(event)}
              aria-label="Seleccionar foto de perfil"
            />
            <button
              className="logout-button"
              onClick={() => void signOut()}
              disabled={busy || !session}
              title={session ? "Cerrar sesión" : "Disponible después de iniciar sesión"}
            >
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        {!configured && (
          <div className="demo-banner">
            <CircleAlert size={16} />
            <span>
              Vista previa con datos ficticios. Configura Supabase para guardar
              información real.
            </span>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              Configurar <ArrowUpRight size={14} />
            </a>
          </div>
        )}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              Mi espacio <ChevronRight size={15} />{" "}
              <strong>{nav.find((n) => n.id === view)?.label}</strong>
            </div>
          </div>
          <div className="topbar-right">
            <span className="top-date">
              {prettyDate(today(), {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <button
              className={`notification-button ${alerts.length ? "has-alerts" : ""}`}
              title="Ver avisos"
              onClick={() => openView("overview")}
            >
              <Bell size={19} />
              {alerts.length > 0 && <i />}
            </button>
          </div>
        </header>
        <div className="page-content">
          {view === "overview" && (
            <>
              <div className="hero-head">
                <div>
                  <span className="eyebrow">PANEL GENERAL</span>
                  <h1>
                    {titleByView[view]}
                    <span className="period">.</span>
                  </h1>
                  <p>Una vista clara de tus clientes, compromisos y números.</p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setEditor({ kind: "client" })}
                >
                  <Plus size={17} /> Nuevo cliente
                </button>
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Clientes activos</span>
                    <div className="stat-icon lilac">
                      <UsersRound size={20} />
                    </div>
                  </div>
                  <strong>
                    {data.clients.length.toString().padStart(2, "0")}
                  </strong>
                  <small>Empresas en tu cartera</small>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Por atender</span>
                    <div className="stat-icon amber">
                      <Bell size={20} />
                    </div>
                  </div>
                  <strong>{alerts.length.toString().padStart(2, "0")}</strong>
                  <small>Vencimientos y entregas</small>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Cobrado a clientes este año</span>
                    <div className="stat-icon blue">
                      <ArrowUpRight size={20} />
                    </div>
                  </div>
                  <strong>{money(chargedThisYear("PEN"))}</strong>
                  <small>
                    Solo totales anuales registrados
                    {hasUsd ? ` · + ${money(chargedThisYear("USD"), "USD")}` : ""}
                  </small>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Pagado a proveedores este año</span>
                    <div className="stat-icon mint">
                      <Wallet size={20} />
                    </div>
                  </div>
                  <strong>{money(providerPaidThisYear("PEN"))}</strong>
                  <small>
                    Pagos registrados de hosting y dominio
                    {hasUsd ? ` · + ${money(providerPaidThisYear("USD"), "USD")}` : ""}
                  </small>
                </div>
              </div>
              <div className="overview-grid">
                <section className="panel">
                  <SectionHeading
                    eyebrow="PRÓXIMOS 30 DÍAS"
                    title="Necesita tu atención"
                    action={
                      <button
                        className="link-button"
                        onClick={() => openView("payments")}
                      >
                        Ver vencimientos <ArrowRight size={16} />
                      </button>
                    }
                  />
                  {alerts.length ? (
                    <div className="attention-list">
                      {alerts.slice(0, 6).map((alert) => (
                        <div
                          className="attention-row"
                          key={`${alert.type}-${alert.id}`}
                        >
                          <div
                            className={`attention-icon ${alert.type === "renewal" ? "orange" : "purple"}`}
                          >
                            {alert.type === "renewal" ? (
                              <Globe2 size={18} />
                            ) : (
                              <CalendarDays size={18} />
                            )}
                          </div>
                          <div className="attention-main">
                            <strong>{alert.title}</strong>
                            <span>{prettyDate(alert.date)}</span>
                          </div>
                          <Badge tone={alert.days <= 0 ? "danger" : "warning"}>
                            {statusOf(alert.date).label}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={CheckCircle2}
                      title="Todo al día"
                      text="No tienes vencimientos ni entregas urgentes."
                    />
                  )}
                </section>
              </div>
              <section className="panel recent-panel">
                <SectionHeading
                  eyebrow="CARTERA"
                  title="Tus clientes"
                  action={
                    <button
                      className="link-button"
                      onClick={() => openView("clients")}
                    >
                      Ver todos <ArrowRight size={16} />
                    </button>
                  }
                />
                {data.clients.length ? (
                  <div className="client-strip">
                    {data.clients.slice(0, 4).map((client) => (
                      <button
                        className="client-mini"
                        key={client.id}
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setView("clients");
                        }}
                      >
                        <div className="company-avatar">
                          {client.company_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong>{client.company_name}</strong>
                          <span>{client.contact_name || "Sin contacto"}</span>
                        </div>
                        <ArrowUpRight size={16} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon={UsersRound}
                    title="Tu cartera comienza aquí"
                    text="Registra tu primer cliente y organiza todos sus datos."
                    action={
                      <button
                        className="button primary"
                        onClick={() => setEditor({ kind: "client" })}
                      >
                        <Plus size={16} /> Agregar cliente
                      </button>
                    }
                  />
                )}
              </section>
            </>
          )}
          {view === "clients" && (
            <>
              <div className="page-head">
                <div>
                  <span className="eyebrow">TU CARTERA</span>
                  <h1>
                    Clientes<span className="period">.</span>
                  </h1>
                  <p>Todos sus datos, servicios y accesos en un solo lugar.</p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setEditor({ kind: "client" })}
                >
                  <Plus size={17} /> Nuevo cliente
                </button>
              </div>
              <div className="clients-layout">
                <section className="panel client-list-panel">
                  <div className="list-toolbar">
                    <div className="search-field">
                      <Search size={18} />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar cliente o empresa…"
                      />
                    </div>
                    <span>{data.clients.length} clientes</span>
                  </div>
                  {data.clients.filter((c) =>
                    `${c.company_name} ${c.contact_name ?? ""} ${c.legal_name ?? ""}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  ).length ? (
                    <div className="client-list">
                      {data.clients
                        .filter((c) =>
                          `${c.company_name} ${c.contact_name ?? ""} ${c.legal_name ?? ""}`
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                        )
                        .map((client) => {
                          const next = renewalsSorted.find(
                            (r) => r.client_id === client.id,
                          );
                          return (
                            <button
                              className={`client-row ${selectedClientId === client.id ? "selected" : ""}`}
                              key={client.id}
                              onClick={() => setSelectedClientId(client.id)}
                            >
                              <div className="company-avatar">
                                {client.company_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="client-row-main">
                                <strong>{client.company_name}</strong>
                                <span>
                                  {client.contact_name || "Sin contacto"}
                                </span>
                              </div>
                              {next && (
                                <span className="client-row-date">
                                  {prettyDate(next.due_date, {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                              )}
                              <ArrowRight size={17} />
                            </button>
                          );
                        })}
                    </div>
                  ) : (
                    <Empty
                      icon={UsersRound}
                      title={query ? "Sin resultados" : "Aún no hay clientes"}
                      text={
                        query
                          ? "Prueba con otro nombre."
                          : "Agrega tu primer cliente para comenzar."
                      }
                    />
                  )}
                </section>
                <section className="panel detail-panel">
                  {selectedClient ? (
                    <>
                      <div className="detail-head">
                        <div className="company-avatar large">
                          {selectedClient.company_name
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <span className="eyebrow">FICHA DEL CLIENTE</span>
                          <h2>{selectedClient.company_name}</h2>
                          <span>
                            {selectedClient.legal_name || "Sin razón social"}
                          </span>
                        </div>
                        <button
                          className="icon-button"
                          title="Editar cliente"
                          onClick={() =>
                            setEditor({ kind: "client", item: selectedClient })
                          }
                        >
                          <Pencil size={18} />
                        </button>
                      </div>
                      <div className="detail-info">
                        <Info
                          label="Contacto"
                          value={selectedClient.contact_name}
                          onCopy={copyText}
                        />
                        <Info
                          label="Teléfono"
                          value={selectedClient.phone}
                          onCopy={copyText}
                          link={
                            selectedClient.phone
                              ? `tel:${selectedClient.phone}`
                              : undefined
                          }
                        />
                        <Info
                          label="Correo"
                          value={selectedClient.email}
                          onCopy={copyText}
                          link={
                            selectedClient.email
                              ? `mailto:${selectedClient.email}`
                              : undefined
                          }
                        />
                        <Info label="RUC" value={selectedClient.tax_id} onCopy={copyText} />
                        <Info label="Rubro" value={selectedClient.industry} onCopy={copyText} />
                        <Info
                          label="Página web"
                          value={selectedClient.website}
                          onCopy={copyText}
                          link={selectedClient.website ? hrefFor(selectedClient.website) : undefined}
                        />
                      </div>
                      {selectedClient.notes && (
                        <p className="detail-note">{selectedClient.notes}</p>
                      )}
                      <div className="detail-section">
                        <div className="detail-section-head">
                          <h3>Servicios y vencimientos</h3>
                          <button
                            className="small-add"
                            onClick={() =>
                              setEditor({
                                kind: "renewal",
                                clientId: selectedClient.id,
                              })
                            }
                          >
                            <Plus size={15} /> Agregar
                          </button>
                        </div>
                        <AnnualLedger
                          renewals={selectedRenewals}
                          payments={data.renewalPayments.filter((payment) => selectedRenewals.some((renewal) => renewal.id === payment.renewal_id))}
                          billing={data.annualBilling.filter((item) => item.client_id === selectedClient.id)}
                          onEdit={(year, item) => setEditor({ kind: "annualBilling", item, clientId: selectedClient.id, billingYear: year })}
                        />
                        {data.renewals.filter(
                          (r) => r.client_id === selectedClient.id,
                        ).length ? (
                          data.renewals
                            .filter((r) => r.client_id === selectedClient.id)
                            .sort((a, b) =>
                              a.due_date.localeCompare(b.due_date),
                            )
                            .map((renewal) => {
                              const history = data.renewalPayments.filter((payment) => payment.renewal_id === renewal.id);
                              return <div className="service-card" key={renewal.id}>
                                <div className="detail-item">
                                  <div className="service-icon"><Globe2 size={17} /></div>
                                  <div>
                                    <strong>{renewal.label}</strong>
                                    <span>{kindLabel[renewal.kind]}</span>
                                  </div>
                                  <button className="icon-button" title="Editar servicio" onClick={() => setEditor({ kind: "renewal", item: renewal })}><Pencil size={16} /></button>
                                </div>
                                <div className="service-dates">
                                  <span>Primera compra: <strong>{renewal.first_purchased_on ? prettyDate(renewal.first_purchased_on) : "Sin registrar"}</strong></span>
                                  <span>Próximo vencimiento: <strong>{prettyDate(renewal.due_date)}</strong></span>
                                </div>
                                {renewal.notes && <p className="service-note"><strong>Observaciones:</strong> {renewal.notes}</p>}
                                <button className="button subtle small service-paid-button" onClick={() => markPaid(renewal)}><Check size={14} /> Registrar pago actual</button>
                                <div className="service-history-head">
                                  <strong>Historial de pagos ({history.length})</strong>
                                  <button className="small-add" onClick={() => setEditor({ kind: "pastPayment", renewalId: renewal.id })}><Plus size={14} /> Agregar pago anterior</button>
                                </div>
                                {history.length ? history.map((payment) => <div className="service-payment" key={payment.id}>
                                  <span>Año {payment.billing_year ?? payment.paid_on.slice(0, 4)} · pago del {prettyDate(payment.paid_on)}</span>
                                  <span>Pagado al proveedor: {money(Number(payment.provider_cost), payment.currency)}</span>
                                  {payment.quoted_provider_cost !== null && <span>Estimado para ese año: {money(Number(payment.quoted_provider_cost), payment.currency)}</span>}
                                  {payment.client_price !== null && <span>Cobro asociado a este servicio (registro anterior): {money(Number(payment.client_price), payment.currency)}</span>}
                                  {payment.notes && <small>{payment.notes}</small>}
                                </div>) : <p className="muted-small">Aún no hay pagos en el historial. Puedes agregar los años anteriores sin alterar el próximo vencimiento.</p>}
                              </div>;
                            })
                        ) : (
                          <p className="muted-small">
                            Aún no hay servicios registrados.
                          </p>
                        )}
                      </div>
                      <div className="detail-section">
                        <div className="detail-section-head">
                          <h3>Accesos</h3>
                          <button
                            className="small-add"
                            onClick={() =>
                              setEditor({
                                kind: "credential",
                                clientId: selectedClient.id,
                              })
                            }
                          >
                            <Plus size={15} /> Agregar
                          </button>
                        </div>
                        {data.credentials.filter(
                          (c) => c.client_id === selectedClient.id,
                        ).length ? (
                          data.credentials
                            .filter((c) => c.client_id === selectedClient.id)
                            .sort((first, second) => credentialPriority(first.service) - credentialPriority(second.service))
                            .map((credential) => (
                              <div
                                className="credential-item"
                                key={credential.id}
                              >
                                <div className="credential-title">
                                  <LockKeyhole size={17} />
                                  <strong>{credential.service}</strong>
                                  <button
                                    className="icon-button copy-button"
                                    title="Copiar nombre del servicio"
                                    aria-label="Copiar nombre del servicio"
                                    onClick={() => void copyText(credential.service, "Servicio")}
                                  >
                                    <Copy size={15} />
                                  </button>
                                  <button
                                    className="icon-button"
                                    title="Editar acceso"
                                    onClick={() =>
                                      setEditor({
                                        kind: "credential",
                                        item: credential,
                                      })
                                    }
                                  >
                                    <Pencil size={15} />
                                  </button>
                                </div>
                                {credential.login_email && (
                                  <div className="credential-field">
                                    <span>Correo: <strong>{credential.login_email}</strong></span>
                                    <button className="icon-button copy-button" title="Copiar correo" aria-label="Copiar correo" onClick={() => void copyText(credential.login_email!, "Correo")}>
                                      <Copy size={15} />
                                    </button>
                                  </div>
                                )}
                                {credential.username && (
                                  <div className="credential-field">
                                    <span>Usuario: <strong>{credential.username}</strong></span>
                                    <button className="icon-button copy-button" title="Copiar usuario" aria-label="Copiar usuario" onClick={() => void copyText(credential.username!, "Usuario")}>
                                      <Copy size={15} />
                                    </button>
                                  </div>
                                )}
                                <div className="secret-row">
                                  <span>
                                    Contraseña:{" "}
                                    {revealed[credential.id] ? (
                                      <code>{revealed[credential.id]}</code>
                                    ) : (
                                      "••••••••"
                                    )}
                                  </span>
                                  <button
                                    className="icon-button"
                                    title={
                                      revealed[credential.id]
                                        ? "Ocultar"
                                        : "Mostrar"
                                    }
                                    onClick={() => void reveal(credential)}
                                  >
                                    {revealed[credential.id] ? (
                                      <EyeOff size={16} />
                                    ) : (
                                      <Eye size={16} />
                                    )}
                                  </button>
                                  <button
                                    className="icon-button copy-button"
                                    title="Copiar contraseña"
                                    aria-label="Copiar contraseña"
                                    onClick={() => void copyPassword(credential)}
                                  >
                                    <Copy size={16} />
                                  </button>
                                </div>
                                {credential.login_url && (
                                  <div className="credential-field credential-link">
                                    <a href={credential.login_url} target="_blank" rel="noreferrer">
                                      {credential.login_url} <ExternalLink size={14} />
                                    </a>
                                    <button className="icon-button copy-button" title="Copiar enlace" aria-label="Copiar enlace" onClick={() => void copyText(credential.login_url!, "Enlace")}>
                                      <Copy size={15} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))
                        ) : (
                          <p className="muted-small">
                            Aún no hay accesos guardados.
                          </p>
                        )}
                      </div>
                      <button
                        className="delete-link"
                        onClick={() =>
                          void remove(
                            "clients",
                            selectedClient.id,
                            `el cliente ${selectedClient.company_name} y todos sus datos`,
                          )
                        }
                      >
                        <Trash2 size={15} /> Eliminar cliente
                      </button>
                    </>
                  ) : (
                    <Empty
                      icon={BriefcaseBusiness}
                      title="Selecciona un cliente"
                      text="Aquí verás sus datos, vencimientos y accesos."
                    />
                  )}
                </section>
              </div>
            </>
          )}
          {view === "payments" && (
            <>
              <div className="page-head">
                <div>
                  <span className="eyebrow">CONTROL DE SERVICIOS</span>
                  <h1>
                    Vencimientos<span className="period">.</span>
                  </h1>
                  <p>
                    Prioriza pagos de hosting, dominio y soporte antes de su
                    fecha límite.
                  </p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setEditor({ kind: "renewal" })}
                >
                  <Plus size={17} /> Nuevo vencimiento
                </button>
              </div>
              <div className="payments-summary">
                <div>
                  <span>Urgentes · 30 días</span>
                  <strong>
                    {
                      data.renewals.filter((r) => daysUntil(r.due_date) <= 30)
                        .length
                    }
                  </strong>
                </div>
                <div>
                  <span>Este año</span>
                  <strong>
                    {
                      data.renewals.filter(
                        (r) => parseDay(r.due_date).getFullYear() === year,
                      ).length
                    }
                  </strong>
                </div>
                <div>
                  <span>Próximo vencimiento</span>
                  <strong className="summary-date">
                    {renewalsSorted[0]
                      ? prettyDate(renewalsSorted[0].due_date, {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </strong>
                </div>
              </div>
              <section className="panel payment-panel">
                <div className="payment-heading">
                  <div>
                    <span className="eyebrow">AGENDA DE PAGOS</span>
                    <h2>Calendario de {year}</h2>
                  </div>
                  <div className="year-controls">
                    <button
                      className="icon-button"
                      onClick={() => setYear(year - 1)}
                      aria-label="Año anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span>{year}</span>
                    <button
                      className="icon-button"
                      onClick={() => setYear(year + 1)}
                      aria-label="Año siguiente"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                {renewalsSorted.filter(
                  (r) => parseDay(r.due_date).getFullYear() === year,
                ).length ? (
                  Array.from({ length: 12 }, (_, index) => index)
                    .filter((index) =>
                      renewalsSorted.some(
                        (r) =>
                          parseDay(r.due_date).getFullYear() === year &&
                          parseDay(r.due_date).getMonth() === index,
                      ),
                    )
                    .map((index) => (
                      <div className="month-group" key={index}>
                        <div className="month-group-title">
                          <span>{monthLabel(index, year)}</span>
                          <i />
                        </div>
                        {renewalsSorted
                          .filter(
                            (r) =>
                              parseDay(r.due_date).getFullYear() === year &&
                              parseDay(r.due_date).getMonth() === index,
                          )
                          .map((renewal) => (
                            <div className="payment-row" key={renewal.id}>
                              <div className="payment-date">
                                <strong>
                                  {parseDay(renewal.due_date)
                                    .getDate()
                                    .toString()
                                    .padStart(2, "0")}
                                </strong>
                                <span>
                                  {new Intl.DateTimeFormat("es-PE", {
                                    weekday: "short",
                                  }).format(parseDay(renewal.due_date))}
                                </span>
                              </div>
                              <div className="payment-content">
                                <strong>
                                  {renewal.label}{" "}
                                  <span>
                                    ·{" "}
                                    {getClient(data, renewal.client_id)
                                      ?.company_name ?? "Cliente"}
                                  </span>
                                </strong>
                                <small>
                                  {kindLabel[renewal.kind]} · Próximo costo estimado{" "}
                                  {renewal.provider_cost === null ? "Por definir" : money(Number(renewal.provider_cost), renewal.currency)}
                                </small>
                              </div>
                              <Badge
                                tone={statusOf(renewal.due_date).className}
                              >
                                {statusOf(renewal.due_date).label}
                              </Badge>
                              <div className="payment-actions">
                                <button
                                  className="icon-button"
                                  title="Editar"
                                  onClick={() =>
                                    setEditor({
                                      kind: "renewal",
                                      item: renewal,
                                    })
                                  }
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  className="icon-button"
                                  title="Eliminar"
                                  onClick={() =>
                                    void remove(
                                      "renewals",
                                      renewal.id,
                                      renewal.label,
                                    )
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
                                <button
                                  className="button subtle small"
                                  disabled={busy}
                                  onClick={() => markPaid(renewal)}
                                >
                                  <Check size={15} /> Pagado
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    ))
                ) : (
                  <Empty
                    icon={CalendarDays}
                    title="No hay vencimientos en este año"
                    text="Registra hosting, dominio o soporte para verlos aquí."
                    action={
                      <button
                        className="button primary"
                        onClick={() => setEditor({ kind: "renewal" })}
                      >
                        <Plus size={16} /> Agregar vencimiento
                      </button>
                    }
                  />
                )}
              </section>
            </>
          )}
          {view === "finances" && (
            <>
              <div className="page-head">
                <div>
                  <span className="eyebrow">CONTROL FINANCIERO</span>
                  <h1>
                    Finanzas<span className="period">.</span>
                  </h1>
                  <p>
                    Registra los ingresos y egresos reales de todos tus
                    proyectos.
                  </p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setEditor({ kind: "transaction" })}
                >
                  <Plus size={17} /> Nuevo movimiento
                </button>
              </div>
              <div className="finance-stats">
                {(["PEN", "USD"] as Currency[])
                  .filter(
                    (currency) =>
                      currency === "PEN" ||
                      data.transactions.some((t) => t.currency === currency),
                  )
                  .map((currency) => {
                    const relevant = data.transactions.filter(
                      (t) =>
                        t.currency === currency &&
                        parseDay(t.occurred_on).getFullYear() === year,
                    );
                    const income = relevant
                      .filter((t) => t.kind === "income")
                      .reduce((s, t) => s + Number(t.amount), 0);
                    const expense = relevant
                      .filter((t) => t.kind === "expense")
                      .reduce((s, t) => s + Number(t.amount), 0);
                    return (
                      <div className="finance-currency" key={currency}>
                        <span className="currency-title">
                          {currency === "PEN"
                            ? "Soles peruanos"
                            : "Dólares estadounidenses"}{" "}
                          · {year}
                        </span>
                        <div className="finance-mini-grid">
                          <div>
                            <span>
                              <ArrowDownLeft size={16} /> Ingresos
                            </span>
                            <strong>{money(income, currency)}</strong>
                          </div>
                          <div>
                            <span>
                              <ArrowUpRight size={16} /> Egresos
                            </span>
                            <strong>{money(expense, currency)}</strong>
                          </div>
                          <div>
                            <span>
                              <Wallet size={16} /> Balance
                            </span>
                            <strong
                              className={income - expense < 0 ? "negative" : ""}
                            >
                              {money(income - expense, currency)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <section className="panel movements-panel">
                <div className="payment-heading">
                  <div>
                    <span className="eyebrow">REGISTRO REAL</span>
                    <h2>Movimientos</h2>
                  </div>
                  <div className="year-controls">
                    <button
                      className="icon-button"
                      onClick={() => setYear(year - 1)}
                      aria-label="Año anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span>{year}</span>
                    <button
                      className="icon-button"
                      onClick={() => setYear(year + 1)}
                      aria-label="Año siguiente"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                {data.transactions.filter(
                  (t) => parseDay(t.occurred_on).getFullYear() === year,
                ).length ? (
                  <div className="transaction-list">
                    {data.transactions
                      .filter(
                        (t) => parseDay(t.occurred_on).getFullYear() === year,
                      )
                      .map((transaction) => (
                        <div className="transaction-row" key={transaction.id}>
                          <div
                            className={`transaction-icon ${transaction.kind}`}
                          >
                            {transaction.kind === "income" ? (
                              <ArrowDownLeft size={19} />
                            ) : (
                              <ArrowUpRight size={19} />
                            )}
                          </div>
                          <div className="transaction-main">
                            <strong>{transaction.description}</strong>
                            <span>
                              {transaction.category} ·{" "}
                              {getClient(data, transaction.client_id)
                                ?.company_name ?? "General"}{" "}
                              · {prettyDate(transaction.occurred_on)}
                            </span>
                          </div>
                          <strong
                            className={`transaction-amount ${transaction.kind}`}
                          >
                            {transaction.kind === "income" ? "+" : "−"}
                            {money(
                              Number(transaction.amount),
                              transaction.currency,
                            )}
                          </strong>
                          <button
                            className="icon-button"
                            title="Editar"
                            onClick={() =>
                              setEditor({
                                kind: "transaction",
                                item: transaction,
                              })
                            }
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-button"
                            title="Eliminar"
                            onClick={() =>
                              void remove(
                                "transactions",
                                transaction.id,
                                transaction.description,
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <Empty
                    icon={Wallet}
                    title="Todavía no hay movimientos"
                    text="Registra ingresos por proyectos o gastos de herramientas y servicios."
                    action={
                      <button
                        className="button primary"
                        onClick={() => setEditor({ kind: "transaction" })}
                      >
                        <Plus size={16} /> Registrar movimiento
                      </button>
                    }
                  />
                )}
              </section>
            </>
          )}
          {view === "calendar" && (
            <>
              <div className="page-head">
                <div>
                  <span className="eyebrow">TU AGENDA</span>
                  <h1>
                    Calendario<span className="period">.</span>
                  </h1>
                  <p>Fechas importantes, entregas y vencimientos conectados.</p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setEditor({ kind: "event" })}
                >
                  <Plus size={17} /> Nuevo evento
                </button>
              </div>
              <div className="calendar-layout">
                <section className="panel calendar-panel">
                  <div className="calendar-toolbar">
                    <div className="calendar-switch">
                      <button
                        className={calendarMode === "month" ? "active" : ""}
                        onClick={() => setCalendarMode("month")}
                      >
                        Mes
                      </button>
                      <button
                        className={calendarMode === "year" ? "active" : ""}
                        onClick={() => setCalendarMode("year")}
                      >
                        Año
                      </button>
                    </div>
                    <div className="calendar-title">
                      <button
                        className="icon-button"
                        onClick={() =>
                          calendarMode === "month"
                            ? shiftMonth(-1)
                            : setYear(year - 1)
                        }
                        aria-label="Anterior"
                      >
                        <ChevronLeft size={19} />
                      </button>
                      <strong>
                        {calendarMode === "month"
                          ? monthLabel(month, year)
                          : year}
                      </strong>
                      <button
                        className="icon-button"
                        onClick={() =>
                          calendarMode === "month"
                            ? shiftMonth(1)
                            : setYear(year + 1)
                        }
                        aria-label="Siguiente"
                      >
                        <ChevronRight size={19} />
                      </button>
                    </div>
                    <button
                      className="button text-button"
                      onClick={() => {
                        setMonth(new Date().getMonth());
                        setYear(new Date().getFullYear());
                      }}
                    >
                      Hoy
                    </button>
                  </div>
                  {calendarMode === "month" ? (
                    <MonthCalendar
                      year={year}
                      month={month}
                      data={data}
                      onDay={(date) =>
                        setEditor({
                          kind: "event",
                          item: { event_date: date } as CalendarEvent,
                        })
                      }
                    />
                  ) : (
                    <div className="year-grid">
                      {Array.from({ length: 12 }, (_, index) => {
                        const count =
                          data.events.filter(
                            (e) =>
                              parseDay(e.event_date).getFullYear() === year &&
                              parseDay(e.event_date).getMonth() === index,
                          ).length +
                          data.renewals.filter(
                            (r) =>
                              parseDay(r.due_date).getFullYear() === year &&
                              parseDay(r.due_date).getMonth() === index,
                          ).length;
                        return (
                          <button
                            className="year-month"
                            key={index}
                            onClick={() => {
                              setMonth(index);
                              setCalendarMode("month");
                            }}
                          >
                            <span>{monthLabel(index, year).split(" ")[0]}</span>
                            <strong>{count.toString().padStart(2, "0")}</strong>
                            <small>
                              {count === 1
                                ? "fecha importante"
                                : "fechas importantes"}
                            </small>
                            <ArrowUpRight size={16} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
                <section className="panel agenda-panel">
                  <SectionHeading
                    eyebrow="AGENDA CERCANA"
                    title="Próximas fechas"
                  />
                  {[
                    ...data.renewals.map((r) => ({
                      id: `r-${r.id}`,
                      date: r.due_date,
                      title: `${kindLabel[r.kind]} · ${getClient(data, r.client_id)?.company_name ?? "Cliente"}`,
                      type: "renewal" as const,
                      original: r,
                    })),
                    ...data.events
                      .filter((e) => !e.completed)
                      .map((e) => ({
                        id: `e-${e.id}`,
                        date: e.event_date,
                        title: e.title,
                        type: "event" as const,
                        original: e,
                      })),
                  ]
                    .filter((item) => daysUntil(item.date) >= -30)
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(0, 8)
                    .map((item) => (
                      <div className="agenda-row" key={item.id}>
                        <div className="agenda-date">
                          <strong>{parseDay(item.date).getDate()}</strong>
                          <span>
                            {new Intl.DateTimeFormat("es-PE", {
                              month: "short",
                            }).format(parseDay(item.date))}
                          </span>
                        </div>
                        <div>
                          <strong>{item.title}</strong>
                          <span>
                            {item.type === "renewal"
                              ? "Vencimiento de servicio"
                              : eventLabel[
                                  (item.original as CalendarEvent).kind
                                ]}
                          </span>
                        </div>
                        {item.type === "event" && (
                          <button
                            className="icon-button"
                            title="Editar evento"
                            onClick={() =>
                              setEditor({
                                kind: "event",
                                item: item.original as CalendarEvent,
                              })
                            }
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  {!data.renewals.length && !data.events.length && (
                    <Empty
                      icon={CalendarDays}
                      title="Agenda libre"
                      text="Tus vencimientos y eventos aparecerán aquí."
                    />
                  )}
                  <div className="agenda-divider" />
                  <SectionHeading eyebrow="TAREAS" title="Pendientes" />
                  {data.events
                    .filter((e) => !e.completed)
                    .slice(0, 5)
                    .map((event) => (
                      <button
                        className="task-row"
                        key={event.id}
                        onClick={() => void toggleEvent(event)}
                      >
                        <span className="task-check" />
                        <span>
                          {event.title}
                          <small>{prettyDate(event.event_date)}</small>
                        </span>
                      </button>
                    ))}
                  {!data.events.some((e) => !e.completed) && (
                    <p className="muted-small">No tienes tareas pendientes.</p>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </main>
      {editor && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditor(null);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Formulario"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  {editor.item?.id && editor.kind !== "paid" ? "EDITAR REGISTRO" : "NUEVO REGISTRO"}
                </span>
                <h2>
                  {editor.kind === "vault"
                    ? vaultVerifier
                      ? "Desbloquear caja fuerte"
                      : "Crear clave maestra"
                    : {
                        client: "Cliente",
                        renewal: "Vencimiento",
                        credential: "Acceso",
                        transaction: "Movimiento",
                        event: "Evento",
                        paid: "Registrar pago",
                        pastPayment: "Pago anterior",
                        annualBilling: "Balance anual",
                      }[editor.kind]}
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setEditor(null)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            {editor.kind === "vault" ? (
              <form onSubmit={unlockVault} className="modal-form">
                <p className="form-hint">
                  {vaultVerifier
                    ? "Ingresa tu clave maestra para ver o guardar contraseñas."
                    : "Crea una clave maestra de al menos 12 caracteres. Guárdala en un lugar seguro: no podemos recuperarla."}
                </p>
                <Field
                  label="Clave maestra"
                  name="passphrase"
                  type="password"
                  required
                  minLength={12}
                  autoComplete="off"
                />
                <div className="modal-actions">
                  <button
                    type="button"
                    className="button subtle"
                    onClick={() => setEditor(null)}
                  >
                    Cancelar
                  </button>
                  <button className="button primary">
                    {vaultVerifier ? "Desbloquear" : "Crear caja fuerte"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={submitEditor} className="modal-form">
                {editor.kind === "client" && (
                  <ClientFields item={editor.item as Client | undefined} />
                )}
                {editor.kind === "renewal" && (
                  <RenewalFields
                    item={editor.item as Renewal | undefined}
                    clients={data.clients}
                    clientId={editor.clientId}
                  />
                )}
                {editor.kind === "paid" && <PaymentFields renewal={editor.item as Renewal} historical={false} />}
                {editor.kind === "pastPayment" && <PaymentFields renewal={data.renewals.find((r) => r.id === editor.renewalId)!} historical />}
                {editor.kind === "annualBilling" && <AnnualBillingFields
                  item={editor.item as AnnualBilling | undefined}
                  year={editor.billingYear ?? new Date().getFullYear()}
                  renewals={data.renewals.filter((renewal) => renewal.client_id === (editor.clientId ?? (editor.item as AnnualBilling | undefined)?.client_id))}
                  payments={data.renewalPayments}
                />}
                {editor.kind === "credential" && (
                  <CredentialFields
                    item={editor.item as Credential | undefined}
                    clients={data.clients}
                    clientId={editor.clientId}
                    vaultOpen={Boolean(passphrase)}
                    onUnlock={() => setEditor({ kind: "vault" })}
                  />
                )}
                {editor.kind === "transaction" && (
                  <TransactionFields
                    item={editor.item as Transaction | undefined}
                    clients={data.clients}
                  />
                )}
                {editor.kind === "event" && (
                  <EventFields
                    item={editor.item as CalendarEvent | undefined}
                    clients={data.clients}
                  />
                )}
                <div className="modal-actions">
                  {editor.item?.id && editor.kind !== "paid" && (
                    <button
                      type="button"
                      className="delete-link modal-delete"
                      onClick={() => void deleteEditorItem()}
                    >
                      <Trash2 size={15} /> Eliminar
                    </button>
                  )}
                  <button
                    type="button"
                    className="button subtle"
                    onClick={() => setEditor(null)}
                  >
                    Cancelar
                  </button>
                  <button className="button primary" disabled={busy}>
                    {busy ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {toast && (
        <div className="toast">
          <CircleAlert size={16} />
          {toast}
          <button onClick={() => setToast("")} aria-label="Cerrar aviso">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  link,
  onCopy,
}: {
  label: string;
  value: string | null;
  link?: string;
  onCopy: (value: string, label: string) => Promise<void>;
}) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <div className="info-value">
        {value ? (
          link ? (
            <a href={link} target={link.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              {value} {link.startsWith("http") && <ExternalLink size={13} />}
            </a>
          ) : (
            <strong>{value}</strong>
          )
        ) : (
          <em>Sin registrar</em>
        )}
        {value && (
          <button className="icon-button copy-button" title={`Copiar ${label.toLowerCase()}`} aria-label={`Copiar ${label.toLowerCase()}`} onClick={() => void onCopy(value, label)}>
            <Copy size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  step?: string;
  autoComplete?: string;
};
function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
  min,
  max,
  minLength,
  step,
  autoComplete,
}: FieldProps) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        minLength={minLength}
        step={step}
        autoComplete={autoComplete}
      />
    </label>
  );
}
function Select({
  label,
  name,
  value,
  options,
  required,
}: {
  label: string;
  name: string;
  value?: string | null;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      <select name={name} defaultValue={value ?? ""} required={required}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function ClientSelect({
  clients,
  value,
  required = false,
}: {
  clients: Client[];
  value?: string | null;
  required?: boolean;
}) {
  return (
    <Select
      label="Cliente"
      name="client_id"
      value={value}
      required={required}
      options={[
        ...(required
          ? [{ value: "", label: "Selecciona un cliente" }]
          : [{ value: "", label: "General · sin cliente" }]),
        ...clients.map((c) => ({ value: c.id, label: c.company_name })),
      ]}
    />
  );
}
function Notes({ value, label = "Notas" }: { value?: string | null; label?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        name="notes"
        defaultValue={value ?? ""}
        rows={3}
        placeholder="Información adicional…"
      />
    </label>
  );
}
function ClientFields({ item }: { item?: Client }) {
  const [industryChoice, setIndustryChoice] = useState(
    item?.industry && !industries.includes(item.industry) ? "other" : (item?.industry ?? ""),
  );
  return (
    <>
      <div className="form-grid">
        <Field
          label="Nombre de empresa"
          name="company_name"
          defaultValue={item?.company_name}
          required
          placeholder="Ej. Mi Empresa"
        />
        <Field
          label="Razón social"
          name="legal_name"
          defaultValue={item?.legal_name}
        />
        <Field label="RUC" name="tax_id" defaultValue={item?.tax_id} />
        <label className="field">
          <span>Rubro de la empresa</span>
          <select name="industry" value={industryChoice} onChange={(event) => setIndustryChoice(event.target.value)}>
            <option value="">Selecciona un rubro</option>
            {industries.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
            <option value="other">Otros</option>
          </select>
        </label>
        {industryChoice === "other" && <Field label="Especifica el rubro" name="industry_other" defaultValue={item?.industry} required />}
        <Field
          label="Nombre completo del contacto"
          name="contact_name"
          defaultValue={item?.contact_name}
        />
        <Field
          label="Teléfono"
          name="phone"
          defaultValue={item?.phone}
          type="tel"
        />
        <Field
          label="Correo de contacto"
          name="email"
          defaultValue={item?.email}
          type="email"
        />
        <Field
          label="Página web"
          name="website"
          defaultValue={item?.website}
          placeholder="www.ejemplo.com o https://ejemplo.com"
        />
      </div>
      <Notes value={item?.notes} />
    </>
  );
}
function RenewalFields({
  item,
  clients,
  clientId,
}: {
  item?: Renewal;
  clients: Client[];
  clientId?: string;
}) {
  return (
    <>
      <div className="form-grid">
        <ClientSelect
          clients={clients}
          value={item?.client_id ?? clientId}
          required
        />
        <Select
          label="Tipo"
          name="kind"
          value={item?.kind ?? "hosting"}
          options={Object.entries(kindLabel).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Field
          label="Nombre del servicio"
          name="label"
          defaultValue={item?.label}
          required
          placeholder="Ej. Hosting principal"
        />
        <Field
          label="Próximo vencimiento"
          name="due_date"
          type="date"
          defaultValue={item?.due_date ?? today()}
          required
        />
        <Field
          label="Primera compra del servicio"
          name="first_purchased_on"
          type="date"
          defaultValue={item?.first_purchased_on}
        />
        <Field
          label="Costo estimado del próximo periodo"
          name="provider_cost"
          type="number"
          defaultValue={item?.provider_cost}
          min={0}
          step="0.01"
        />
        <Select
          label="Moneda del costo al proveedor"
          name="currency"
          value={item?.currency ?? "PEN"}
          options={[
            { value: "PEN", label: "Soles (PEN)" },
            { value: "USD", label: "Dólares (USD)" },
          ]}
        />
        <Select
          label="Frecuencia"
          name="billing_months"
          value={String(item?.billing_months ?? 12)}
          options={[
            { value: "1", label: "Mensual" },
            { value: "3", label: "Cada 3 meses" },
            { value: "6", label: "Cada 6 meses" },
            { value: "12", label: "Anual" },
            { value: "24", label: "Cada 2 años" },
          ]}
        />
      </div>
      <p className="form-hint">
        El aviso aparecerá 30 días antes. Este costo es lo que pagarás al proveedor; el total que cobras al cliente por hosting, dominio y soporte se registra una sola vez en el balance anual de su ficha. Si este servicio ya existía, revisa el estimado: podría ser el precio promocional del primer año.
      </p>
      <Notes value={item?.notes} label="Observaciones" />
    </>
  );
}
function PaymentFields({ renewal, historical }: { renewal: Renewal; historical: boolean }) {
  return <>
    <p className="form-hint">
      <strong>{renewal.label}</strong> · {kindLabel[renewal.kind]} · {renewal.currency}. {historical
        ? "Agrega un pago realizado anteriormente. No cambiará el próximo vencimiento ni creará un movimiento financiero duplicado."
        : `Vencimiento actual: ${prettyDate(renewal.due_date)}. Al guardar, se registrará el egreso real y se avanzará el vencimiento ${renewal.billing_months} meses.`}
    </p>
    <div className="form-grid">
      <Field label="Fecha del pago" name="paid_on" type="date" defaultValue={today()} required />
      <Field label="Pagado al proveedor (real)" name="provider_cost" type="number" min={0} step="0.01" required />
      {historical && <Field label="Año al que corresponde (si difiere de la fecha del pago)" name="billing_year" type="number" min={2000} max={2100} />}
      {historical && <Field label="Costo estimado que te dio el proveedor ese año (opcional)" name="quoted_provider_cost" type="number" min={0} step="0.01" />}
      {!historical && <Field label="Costo estimado para la próxima renovación" name="next_provider_cost" type="number" min={0} step="0.01" />}
    </div>
    <Notes />
  </>;
}
type ProviderCostDraft = {
  currency: Currency;
  paid: string;
  paid_client_currency: string;
};
function providerCostDraft(cost: AnnualProviderCost | null | undefined, currency: Currency): ProviderCostDraft {
  return {
    currency: cost?.currency ?? currency,
    paid: cost?.paid == null ? "" : String(cost.paid),
    paid_client_currency: cost?.paid_client_currency == null ? "" : String(cost.paid_client_currency),
  };
}
function AnnualBillingFields({ item, year, renewals, payments }: {
  item?: AnnualBilling;
  year: number;
  renewals: Renewal[];
  payments: RenewalPayment[];
}) {
  const [activeYear, setActiveYear] = useState(item?.billing_year ?? year);
  const [currency, setCurrency] = useState<Currency>(item?.currency ?? "PEN");
  const [receivedTotal, setReceivedTotal] = useState(item?.charged_total == null ? "" : String(item.charged_total));
  const [selected, setSelected] = useState<Record<BillingService, boolean>>(() => Object.fromEntries(
    billingServices.map((service) => [service,
      item?.cost_breakdown?.version === 2
        ? service === "support" ? item.cost_breakdown.support : item.cost_breakdown[service] !== null
        : (item?.[`quoted_${service}`] ?? null) !== null ||
          (item?.[`charged_${service}`] ?? null) !== null,
    ]),
  ) as Record<BillingService, boolean>);
  const [providerDrafts, setProviderDrafts] = useState<Record<"hosting" | "domain", ProviderCostDraft>>(() => ({
    hosting: providerCostDraft(item?.cost_breakdown?.hosting, renewals.find((renewal) => renewal.kind === "hosting")?.currency ?? item?.currency ?? "PEN"),
    domain: providerCostDraft(item?.cost_breakdown?.domain, renewals.find((renewal) => renewal.kind === "domain")?.currency ?? item?.currency ?? "PEN"),
  }));
  const providerRenewals = renewals.filter((renewal) => renewal.kind === "hosting" || renewal.kind === "domain");
  const { costs } = annualBreakdown(activeYear, providerRenewals, payments);
  const toAmount = (value: string) => value === "" ? null : Number(value);
  const toCost = (service: "hosting" | "domain"): AnnualProviderCost | null => {
    if (!selected[service]) return null;
    const draft = providerDrafts[service];
    const previous = item?.cost_breakdown?.[service];
    const keepPreviousEstimate = previous?.currency === draft.currency;
    return {
      currency: draft.currency,
      estimated: keepPreviousEstimate ? previous.estimated : null,
      paid: toAmount(draft.paid),
      estimated_client_currency: keepPreviousEstimate ? previous.estimated_client_currency : null,
      paid_client_currency: toAmount(draft.paid_client_currency),
    };
  };
  const breakdown: AnnualCostBreakdown = { version: 2, hosting: toCost("hosting"), domain: toCost("domain"), support: selected.support };
  const chargedSupport = calculateSupport(toAmount(receivedTotal), breakdown, currency, "charged");
  const providerSummary = (service: BillingService) => {
    const amounts = costs.filter(({ renewal }) => renewal.kind === service).flatMap(({ history }) =>
      history.map((payment) => ({ amount: Number(payment.provider_cost), currency: payment.currency })),
    );
    if (!amounts.length) return "Sin registrar";
    const byCurrency = new Map<Currency, number>();
    amounts.forEach(({ amount, currency: providerCurrency }) =>
      byCurrency.set(providerCurrency, (byCurrency.get(providerCurrency) ?? 0) + amount));
    return [...byCurrency].map(([providerCurrency, amount]) => money(amount, providerCurrency)).join(" · ");
  };
  const supportText = (result: typeof chargedSupport) => {
    if (result.status === "ready") return money(result.amount, currency);
    if (result.status === "missing_total") return "Ingresa el total recibido";
    if (result.status === "missing_equivalent") return `Ingresa el equivalente en ${currency} de ${result.service === "hosting" ? "hosting" : "dominio"}`;
    if (result.status === "missing_cost") return `Ingresa el costo pagado de ${result.service === "hosting" ? "hosting" : "dominio"}`;
    return "No incluido";
  };
  const names: Record<BillingService, string> = { hosting: "Hosting", domain: "Dominio", support: "Soporte anual" };
  return <>
    <p className="form-hint">Ingresa el total recibido del cliente y cuánto pagaste a cada proveedor. Si incluyes soporte, se calcula como total menos costos de hosting y dominio. Este balance no crea pagos ni cambia vencimientos.</p>
    {item && !item.cost_breakdown &&
      <p className="form-hint">Este registro se creó con el formulario anterior. Sus totales se conservaron. Revisa los costos del proveedor antes de guardar el nuevo cálculo; los antiguos importes por servicio eran cobros al cliente, no costos del proveedor.</p>}
    <div className="form-grid">
      <label className="field"><span>Año del servicio <b>*</b></span><input name="billing_year" type="number" value={activeYear} onChange={(event) => setActiveYear(Number(event.target.value))} min={2000} max={2100} required /></label>
      <label className="field"><span>Moneda en que paga el cliente</span><select name="currency" value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></label>
      <label className="field"><span>Total que recibiste del cliente <b>*</b></span><input name="charged_total" type="number" min={0} step="0.01" value={receivedTotal} onChange={(event) => setReceivedTotal(event.target.value)} placeholder="Ejemplo: 230.00" required /></label>
    </div>
    <div className="billing-pick">
      <strong>¿Qué servicios incluye este total?</strong>
      <div>{billingServices.map((service) => <label key={service}><input type="checkbox" name={`include_${service}`} checked={selected[service]} onChange={(event) => setSelected((current) => ({ ...current, [service]: event.target.checked }))} />{names[service]}</label>)}</div>
    </div>
    {(["hosting", "domain"] as const).filter((service) => selected[service]).map((service) => <div className="billing-service" key={service}>
      <h4>{names[service]}</h4>
      <div className="form-grid">
        <label className="field"><span>Moneda del proveedor</span><select name={`${service}_currency`} value={providerDrafts[service].currency} onChange={(event) => setProviderDrafts((current) => ({ ...current, [service]: { ...current[service], currency: event.target.value as Currency } }))}><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></label>
        <span aria-hidden="true" />
        <label className="field"><span>Costo que pagaste al proveedor</span>
          <input name={`${service}_paid`} type="number" min={0} step="0.01" value={providerDrafts[service].paid} onChange={(event) => setProviderDrafts((current) => ({ ...current, [service]: { ...current[service], paid: event.target.value } }))} placeholder="0.00" />
        </label>
        {providerDrafts[service].currency !== currency && <label className="field">
          <span>Costo pagado equivalente en {currency}</span>
          <input name={`${service}_paid_client_currency`} type="number" min={0} step="0.01" value={providerDrafts[service].paid_client_currency} onChange={(event) => setProviderDrafts((current) => ({ ...current, [service]: { ...current[service], paid_client_currency: event.target.value } }))} placeholder="0.00" />
        </label>}
      </div>
      <p>Pagado en el historial del servicio: <strong>{providerSummary(service)}</strong>.</p>
    </div>)}
    {selected.support && <div className="billing-totals">
      <div><span>Tu ingreso por soporte (se calcula automáticamente)</span><strong>{supportText(chargedSupport)}</strong></div>
    </div>}
    <Field label="Fecha en que recibiste el pago del cliente" name="charged_on" type="date" defaultValue={item?.charged_on} />
    <Notes value={item?.notes} />
  </>;
}
const credentialServices = ["CPanel", "Namecheap", "Hosting", "Gmail", "Outlook"];
function CredentialFields({
  item,
  clients,
  clientId,
  vaultOpen,
  onUnlock,
}: {
  item?: Credential;
  clients: Client[];
  clientId?: string;
  vaultOpen: boolean;
  onUnlock: () => void;
}) {
  const knownService = credentialServices.find((service) => service.toLowerCase() === item?.service.trim().toLowerCase());
  const [service, setService] = useState(knownService ?? (item?.service ? "other" : ""));
  return (
    <>
      <div className="form-grid">
        <ClientSelect
          clients={clients}
          value={item?.client_id ?? clientId}
          required
        />
        <label className="field"><span>Servicio <b>*</b></span><select name="service" value={service} onChange={(event) => setService(event.target.value)} required>
          <option value="">Selecciona el tipo de acceso</option>
          {credentialServices.map((option) => <option key={option} value={option}>{option}</option>)}
          <option value="other">Otros</option>
        </select></label>
        {service === "other" && <Field label="Nombre del otro acceso" name="service_other" defaultValue={knownService ? "" : item?.service} required placeholder="Escribe el tipo de acceso" />}
        <Field
          label="Correo de acceso"
          name="login_email"
          defaultValue={item?.login_email}
          type="email"
        />
        <Field label="Usuario" name="username" defaultValue={item?.username} />
        <Field
          label="Enlace de acceso"
          name="login_url"
          defaultValue={item?.login_url}
          placeholder="https://…"
        />
        <Field
          label={item ? "Nueva contraseña (opcional)" : "Contraseña"}
          name="password"
          type="password"
          autoComplete="new-password"
        />
      </div>
      <div className="vault-hint">
        <LockKeyhole size={17} />
        <span>
          {vaultOpen
            ? "La contraseña se cifrará antes de enviarla a la base de datos."
            : "Desbloquea la caja fuerte para guardar una contraseña."}
        </span>
        {!vaultOpen && (
          <button type="button" onClick={onUnlock}>
            Desbloquear
          </button>
        )}
      </div>
      <Notes value={item?.notes} />
    </>
  );
}
function TransactionFields({
  item,
  clients,
}: {
  item?: Transaction;
  clients: Client[];
}) {
  return (
    <>
      <div className="form-grid">
        <Select
          label="Tipo"
          name="kind"
          value={item?.kind ?? "income"}
          options={[
            { value: "income", label: "Ingreso" },
            { value: "expense", label: "Egreso" },
          ]}
        />
        <ClientSelect clients={clients} value={item?.client_id} />
        <Field
          label="Categoría"
          name="category"
          defaultValue={item?.category}
          required
          placeholder="Página web, plataforma, herramientas…"
        />
        <Field
          label="Descripción"
          name="description"
          defaultValue={item?.description}
          required
        />
        <Field
          label="Monto"
          name="amount"
          type="number"
          defaultValue={item?.amount}
          min={0}
          step="0.01"
          required
        />
        <Select
          label="Moneda"
          name="currency"
          value={item?.currency ?? "PEN"}
          options={[
            { value: "PEN", label: "Soles (PEN)" },
            { value: "USD", label: "Dólares (USD)" },
          ]}
        />
        <Field
          label="Fecha"
          name="occurred_on"
          type="date"
          defaultValue={item?.occurred_on ?? today()}
          required
        />
      </div>
    </>
  );
}
function EventFields({
  item,
  clients,
}: {
  item?: CalendarEvent;
  clients: Client[];
}) {
  return (
    <>
      <div className="form-grid">
        <Field
          label="Título"
          name="title"
          defaultValue={item?.title}
          required
          placeholder="Ej. Entrega de página web"
        />
        <ClientSelect clients={clients} value={item?.client_id} />
        <Select
          label="Tipo"
          name="kind"
          value={item?.kind ?? "task"}
          options={Object.entries(eventLabel).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Field
          label="Fecha"
          name="event_date"
          type="date"
          defaultValue={item?.event_date ?? today()}
          required
        />
        <Field
          label="Avisar antes (días)"
          name="remind_days"
          type="number"
          defaultValue={item?.remind_days ?? 7}
          min={0}
          max={365}
          required
        />
      </div>
      <Notes value={item?.notes} />
      <label className="checkbox-field">
        <input
          name="completed"
          type="checkbox"
          defaultChecked={item?.completed ?? false}
        />{" "}
        Marcar como completado
      </label>
    </>
  );
}

function MonthCalendar({
  year,
  month,
  data,
  onDay,
}: {
  year: number;
  month: number;
  data: Data;
  onDay: (date: string) => void;
}) {
  const start = new Date(year, month, 1);
  const offset = (start.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((offset + days) / 7) * 7;
  const dateString = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return (
    <div className="calendar-grid">
      <div className="week-head">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="days-grid">
        {Array.from({ length: cells }, (_, index) => {
          const day = index - offset + 1;
          if (day < 1 || day > days)
            return <div className="calendar-day outside" key={index} />;
          const date = dateString(day);
          const renewals = data.renewals.filter((r) => r.due_date === date);
          const events = data.events.filter((e) => e.event_date === date);
          return (
            <button
              className={`calendar-day ${date === today() ? "today" : ""}`}
              key={index}
              onClick={() => onDay(date)}
            >
              <span className="day-number">{day}</span>
              <div className="day-items">
                {renewals.slice(0, 2).map((r) => (
                  <span
                    className="day-chip renewal"
                    key={r.id}
                    title={`${kindLabel[r.kind]} · ${getClient(data, r.client_id)?.company_name}`}
                  >
                    {kindLabel[r.kind]} ·{" "}
                    {getClient(data, r.client_id)?.company_name}
                  </span>
                ))}
                {events.slice(0, Math.max(0, 2 - renewals.length)).map((e) => (
                  <span
                    className={`day-chip event ${e.completed ? "complete" : ""}`}
                    key={e.id}
                    title={e.title}
                  >
                    {e.title}
                  </span>
                ))}
                {renewals.length + events.length > 2 && (
                  <small>+{renewals.length + events.length - 2} más</small>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span>
          <i className="dot orange" /> Vencimientos
        </span>
        <span>
          <i className="dot purple" /> Eventos y entregas
        </span>
      </div>
    </div>
  );
}
