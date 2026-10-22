export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const parseDay = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const daysUntil = (date: string, from = today()) =>
  Math.round(
    (parseDay(date).getTime() - parseDay(from).getTime()) / 86_400_000,
  );

export const prettyDate = (
  date: string,
  options?: Intl.DateTimeFormatOptions,
) =>
  new Intl.DateTimeFormat(
    "es-PE",
    options ?? { day: "numeric", month: "long", year: "numeric" },
  ).format(parseDay(date));

export const monthLabel = (month: number, year: number) =>
  new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1),
  );

export const addMonths = (date: string, count: number) => {
  const d = parseDay(date);
  const targetMonth = d.getMonth() + count;
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(targetMonth);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const money = (value: number, currency: "PEN" | "USD" = "PEN") =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
