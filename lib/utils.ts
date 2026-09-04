import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${sign}S/ ${formatted}`;
}

export function formatDate(date: string): string {
  try {
    return format(new Date(date), "dd MMM yyyy", { locale: es });
  } catch {
    return date;
  }
}

export function formatDatetime(date: string): string {
  try {
    const d = new Date(date);
    const datePart = format(d, "dd MMM yyyy", { locale: es });
    const timePart = format(d, "hh:mm a");
    return `${datePart}, ${timePart}`;
  } catch {
    return date;
  }
}

export function getMonthName(month: number): string {
  const names = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return names[month - 1] ?? "";
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/** Fecha local del día en formato YYYY-MM-DD (evita el desfase de UTC). */
export function todayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Convierte una fecha Date a string local YYYY-MM-DD. */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

/** Devuelve la URL firmada de un comprobante guardado en Supabase Storage. */
export async function getReceiptSignedUrl(
  supabase: any,
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null;
  try {
    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
