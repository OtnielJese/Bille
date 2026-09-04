import { Suspense } from "react";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDownRight, ArrowRight, PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/StatCard";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { formatCurrency, getCurrentMonthYear } from "@/lib/utils";
import { SyncEmailButton } from "@/components/dashboard/SyncEmailButton";
import type {
  CategoryStat,
  ChartDataPoint,
  DashboardStats,
  Transaction,
} from "@/types";

// Evita que Next.js cachee esta página: siempre consulta datos frescos.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const today = format(new Date(), "EEEE d 'de' MMMM 'de' yyyy", {
    locale: es,
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel Principal</h1>
        <p className="text-sm capitalize text-muted-foreground">{today}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal: métricas, gráfico y transacciones recientes */}
        <div className="space-y-6 lg:col-span-2">
        <Suspense fallback={<StatsSkeleton />}>
          <StatsCards />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <ChartSection />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <RecentSection />
        </Suspense>
      </div>

      {/* Columna secundaria: categorías */}
      <div className="space-y-6">
        <Suspense fallback={<CardSkeleton />}>
          <BreakdownSection />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <BudgetDetailSection />
        </Suspense>
      </div>
      </div>
    </div>
  );
}

async function StatsCards() {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const { month, year } = getCurrentMonthYear();
  const start = format(startOfMonth(now), "yyyy-MM-dd");
  const end = format(endOfMonth(now), "yyyy-MM-dd");
  const prevStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

  const [{ data: budget }, { data: txs }, { data: catBudgets }] = await Promise.all([
    supabase
      .from("budgets")
      .select("total")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("type, amount, date")
      .eq("user_id", user.id)
      .gte("date", prevStart)
      .lte("date", end),
    supabase
      .from("category_budgets")
      .select("amount")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year),
  ]);

  let spent = 0;
  let income = 0;
  let savings = 0;
  let prevSpent = 0;
  let prevIncome = 0;

  for (const t of txs ?? []) {
    const amt = Number(t.amount);
    const inPrev = t.date < start;
    if (t.type === "egreso") {
      if (inPrev) prevSpent += amt;
      else spent += amt;
    } else if (t.type === "ingreso") {
      if (inPrev) prevIncome += amt;
      else income += amt;
    } else if (t.type === "ahorro" && !inPrev) {
      savings += amt;
    }
  }

  const catBudgetTotal = (catBudgets ?? []).reduce(
    (sum, b) => sum + Number(b.amount),
    0
  );
  // Si hay presupuesto total configurado se usa; si no, se suma el presupuesto por categorías
  const total =
    Number(budget?.total ?? 0) > 0 ? Number(budget?.total) : catBudgetTotal;
  const remaining = total - spent;
  const pctUsed = total > 0 ? (spent / total) * 100 : 0;

  const stats: DashboardStats = {
    total_budget: total,
    total_spent: spent,
    total_income: income,
    savings,
    remaining,
    pct_used: pctUsed,
  };

  const spentChange = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : null;
  const incomeChange = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : null;

  // Series diarias para los sparklines
  const daysInMonth = parseInt(format(endOfMonth(now), "d"), 10);
  const spentByDay = new Array(daysInMonth).fill(0);
  const incomeByDay = new Array(daysInMonth).fill(0);
  for (const t of txs ?? []) {
    if (t.date < start) continue;
    const day = parseInt(t.date.slice(8, 10), 10);
    if (Number.isNaN(day) || day < 1 || day > daysInMonth) continue;
    if (t.type === "egreso") spentByDay[day - 1] += Number(t.amount);
    else if (t.type === "ingreso") incomeByDay[day - 1] += Number(t.amount);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard
        title="Gastado este mes"
        value={formatCurrency(stats.total_spent)}
        gradient="from-rose-500 to-pink-500"
        change={spentChange}
        positiveIsGood={false}
        spark={spentByDay}
        icon={TrendingDown}
      />
      <StatCard
        title="Ingresos"
        value={formatCurrency(stats.total_income)}
        gradient="from-emerald-500 to-teal-400"
        change={incomeChange}
        spark={incomeByDay}
        icon={TrendingUp}
      />
      <StatCard
        title="Presupuesto"
        value={formatCurrency(stats.total_budget)}
        gradient="from-teal-600 to-cyan-500"
        footer="Presupuesto mensual"
        icon={Wallet}
      />
      <StatCard
        title="Restante"
        value={formatCurrency(stats.remaining)}
        gradient="from-sky-500 to-cyan-400"
        footer="Disponible para gastar"
        icon={PiggyBank}
      />
    </div>
  );
}

async function ChartSection() {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    months.push({
      key: format(d, "yyyy-MM"),
      label: format(d, "MMM", { locale: es }).replace(".", ""),
    });
  }
  const start = format(startOfMonth(subMonths(now, 5)), "yyyy-MM-dd");

  const { data: txs } = await supabase
    .from("transactions")
    .select("type, amount, date")
    .eq("user_id", user.id)
    .gte("date", start);

  const data: ChartDataPoint[] = months.map((m) => ({
    month: m.label.charAt(0).toUpperCase() + m.label.slice(1),
    ingresos: 0,
    egresos: 0,
  }));

  for (const t of txs ?? []) {
    const key = t.date.slice(0, 7);
    const idx = months.findIndex((m) => m.key === key);
    if (idx === -1) continue;
    if (t.type === "ingreso") data[idx].ingresos += Number(t.amount);
    else if (t.type === "egreso") data[idx].egresos += Number(t.amount);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos vs Egresos</CardTitle>
        <CardDescription>Últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <IncomeExpenseChart data={data} />
      </CardContent>
    </Card>
  );
}

async function BreakdownSection() {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const start = format(startOfMonth(now), "yyyy-MM-dd");
  const end = format(endOfMonth(now), "yyyy-MM-dd");

  const { data: txs } = await supabase
    .from("transactions")
    .select("amount, category:categories(*)")
    .eq("user_id", user.id)
    .eq("type", "egreso")
    .gte("date", start)
    .lte("date", end);

  const grouped = new Map<string, { category: any; amount: number }>();
  let total = 0;
  for (const t of txs ?? []) {
    const category = (t as any).category;
    const id = category?.id ?? "none";
    const amount = Number(t.amount);
    total += amount;
    const existing = grouped.get(id);
    if (existing) existing.amount += amount;
    else grouped.set(id, { category: category ?? null, amount });
  }

  const stats: CategoryStat[] = Array.from(grouped.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
    .map((s) => ({
      category: s.category,
      amount: s.amount,
      percentage: total > 0 ? (s.amount / total) * 100 : 0,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorías</CardTitle>
      </CardHeader>
      <CardContent>
        {stats.length > 0 ? (
          <CategoryBreakdown stats={stats} />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay gastos este mes.
          </p>
        )}
        <Link
          href="/categories"
          className="mt-4 flex items-center justify-center gap-1 rounded-xl border py-2 text-sm font-medium text-primary transition-colors hover:bg-accent"
        >
          Ver todas las categorías
          <ArrowRight className="h-4 w-4" />
        </Link>
        <SyncEmailButton />
      </CardContent>
    </Card>
  );
}

async function RecentSection() {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: txs } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transacciones recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {(txs?.length ?? 0) > 0 ? (
          <RecentTransactions transactions={(txs as Transaction[]) ?? []} />
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <ArrowDownRight className="mx-auto mb-2 h-8 w-8 opacity-40" />
            No tienes transacciones todavía.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function BudgetDetailSection() {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { month, year } = getCurrentMonthYear();
  const now = new Date();
  const start = format(startOfMonth(now), "yyyy-MM-dd");
  const end = format(endOfMonth(now), "yyyy-MM-dd");

  const [{ data: cats }, { data: budgets }, { data: txs }] = await Promise.all([
    supabase.from("categories").select("*").eq("user_id", user.id),
    supabase
      .from("category_budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year),
    supabase
      .from("transactions")
      .select("category_id, amount")
      .eq("user_id", user.id)
      .eq("type", "egreso")
      .gte("date", start)
      .lte("date", end),
  ]);

  const spentBy = new Map<string, number>();
  for (const t of txs ?? []) {
    const id = t.category_id ?? "none";
    spentBy.set(id, (spentBy.get(id) ?? 0) + Number(t.amount));
  }

  const rows = (budgets ?? [])
    .map((b: any) => {
      const cat = (cats ?? []).find((c: any) => c.id === b.category_id);
      return {
        id: b.id,
        name: cat?.name ?? "Sin categoría",
        icon: cat?.icon ?? "📌",
        color: cat?.color ?? "#0d9488",
        amount: Number(b.amount),
        spent: spentBy.get(b.category_id) ?? 0,
      };
    })
    .filter((r) => r.amount > 0);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Presupuesto por categoría</CardTitle>
        <CardDescription>Detalle del mes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((r) => {
          const pct = r.amount > 0 ? Math.min(100, (r.spent / r.amount) * 100) : 0;
          return (
            <div key={r.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                    style={{ backgroundColor: `${r.color}1a` }}
                  >
                    {r.icon}
                  </span>
                  {r.name}
                </span>
                <span className="font-semibold">
                  {formatCurrency(r.spent)} / {formatCurrency(r.amount)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: r.color }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-3 h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[220px] w-full" />
      </CardContent>
    </Card>
  );
}
