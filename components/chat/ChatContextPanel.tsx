import Link from "next/link";
import { ArrowUpRight, Pencil } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { formatCurrency, getCurrentMonthYear } from "@/lib/utils";

export async function ChatContextPanel() {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const { month, year } = getCurrentMonthYear();
  const start = format(startOfMonth(now), "yyyy-MM-dd");
  const end = format(endOfMonth(now), "yyyy-MM-dd");

  const [{ data: budget }, { data: txs }] = await Promise.all([
    supabase
      .from("budgets")
      .select("total")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("type, amount, category:categories(*)")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end),
  ]);

  let spent = 0;
  let income = 0;
  const byCategory = new Map<string, number>();

  for (const t of txs ?? []) {
    const amount = Number(t.amount);
    if (t.type === "egreso") {
      spent += amount;
      const name = (t as any).category?.name ?? "Otros";
      byCategory.set(name, (byCategory.get(name) ?? 0) + amount);
    } else if (t.type === "ingreso") {
      income += amount;
    }
  }

  const total = Number(budget?.total ?? 0);
  const topCategory = Array.from(byCategory.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const insight = topCategory
    ? `Tu mayor gasto este mes es en "${topCategory[0]}" con ${formatCurrency(
        topCategory[1]
      )}.`
    : "Registra tus gastos para obtener insights personalizados.";

  return (
    <div className="space-y-4">
      {/* Contexto mensual */}
      <div className="rounded-2xl border bg-card p-5 shadow-violet-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Contexto Mensual
          </h2>
          <Link
            href="/budget"
            className="flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:underline"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar contexto
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Gastos (Este mes)</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {formatCurrency(spent)}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                / {formatCurrency(total)}
              </span>
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[#0d9488]"
                style={{
                  width: `${total > 0 ? Math.min(100, (spent / total) * 100) : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Ingresos (Este mes)</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {formatCurrency(income)}
            </p>
            <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Registrado este mes
            </span>
          </div>
        </div>
      </div>

      {/* Insight destacado */}
      <div className="rounded-2xl border bg-[#f5f3ff] p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-[#0d9488]">
          Insight Destacado
        </p>
        <p className="mt-2 text-sm text-foreground">{insight}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/chat"
            className="rounded-full border px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-accent"
          >
            ¿Cómo gasto menos?
          </Link>
          <Link
            href="/budget"
            className="rounded-full border px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-accent"
          >
            Resumen mensual
          </Link>
          <Link
            href="/transactions?new=1"
            className="rounded-full border px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-accent"
          >
            Registro gasto
          </Link>
        </div>
      </div>
    </div>
  );
}
