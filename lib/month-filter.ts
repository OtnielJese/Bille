import { monthRange, peruToday } from "@/lib/finance";

export function isValidMonth(value: unknown): value is string {
  return typeof value === "string" && /^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(value);
}

export function shiftMonth(value: string, offset: number): string {
  const date = new Date(value + "-01T12:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export function monthFromRange(start: string, end: string): string {
  const value = start.slice(0, 7);
  if (!isValidMonth(value)) return "";
  const range = monthRange(value + "-01");
  return range.start === start && range.end === end ? value : "";
}

export function getMonthView(value?: unknown, today = peruToday()) {
  const selected = isValidMonth(value) ? value : today.slice(0, 7);
  const range = monthRange(selected + "-01");
  const previous = shiftMonth(selected, -1);
  const previousRange = monthRange(previous + "-01");
  const current = selected === today.slice(0, 7);
  const days = current ? Number(today.slice(8)) : Number(range.end.slice(8));
  const comparisonEnd = current
    ? previous + "-" + String(Math.min(days, Number(previousRange.end.slice(8)))).padStart(2, "0")
    : previousRange.end;
  const label = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(range.start + "T12:00:00Z"));
  return { ...range, value: selected, label, current, days, previous, comparisonEnd, currentEnd: current ? today : range.end };
}

export type MonthView = ReturnType<typeof getMonthView>;
