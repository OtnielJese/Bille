import { Suspense } from "react";
import { loadFinancialSummary } from "@/lib/financial-summary";
import { peruToday, sumMoney } from "@/lib/finance";
import { getMonthView, type MonthView } from "@/lib/month-filter";
import { DashboardMonthFilter } from "@/components/dashboard/DashboardMonthFilter";
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
import { formatCurrency } from "@/lib/utils";
import { SyncEmailButton } from "@/components/dashboard/SyncEmailButton";
import type {
  CategoryStat,
  ChartDataPoint,
  Transaction,
} from "@/types";

// Evita que Next.js cachee esta página: siempre consulta datos frescos.
export const dynamic = "force-dynamic";

export default function DashboardPage({ searchParams }: { searchParams?: { month?: string | string[] } }) {
  const view = getMonthView(searchParams?.month);
  const today = format(new Date(peruToday() + "T12:00:00"), "EEEE d 'de' MMMM 'de' yyyy", {
    locale: es,
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel Principal</h1>
        <p className="text-sm first-letter:uppercase text-muted-foreground">{today}</p>
        <p className="mt-1 text-sm font-medium capitalize">{view.label}</p>
        </div>
        <DashboardMonthFilter value={view.value} currentMonth={peruToday().slice(0, 7)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal: métricas, gráfico y transacciones recientes */}
        <div className="space-y-6 lg:col-span-2">
        <Suspense key={"section-1-" + view.value} fallback={<StatsSkeleton />}>
          <StatsCards view={view} />
        </Suspense>
        <Suspense key={"section-2-" + view.value} fallback={<CardSkeleton />}>
          <ChartSection view={view} />
        </Suspense>
        <Suspense key={"section-3-" + view.value} fallback={<CardSkeleton />}>
          <RecentSection view={view} />
        </Suspense>
      </div>

      {/* Columna secundaria: categorías */}
      <div className="space-y-6">
        <Suspense key={"section-4-" + view.value} fallback={<CardSkeleton />}>
          <BreakdownSection view={view} />
        </Suspense>
        <Suspense key={"section-5-" + view.value} fallback={<CardSkeleton />}>
          <BudgetDetailSection view={view} />
        </Suspense>
      </div>
      </div>
    </div>
  );
}

async function StatsCards({ view }: { view: MonthView }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return null;
  const { month, year } = view;
  const previous = new Date(view.previous + '-01T12:00:00');
  const [summary, previousSummary] = await Promise.all([
    loadFinancialSummary(supabase, user.id, month, year),
    loadFinancialSummary(supabase, user.id, previous.getMonth() + 1, previous.getFullYear()),
  ]);
  const comparisonEnd = view.comparisonEnd;
  const previousTx = previousSummary.transactions.filter(t => t.date <= comparisonEnd);
  const comparableTx = summary.transactions.filter(t => t.date <= view.currentEnd);
  const previousTotal = (type: string) => sumMoney(previousTx.filter(t => t.type === type).map(t => t.amount));
  const currentTotal = (type: string) => sumMoney(comparableTx.filter(t => t.type === type).map(t => t.amount));
  const change = (type: string) => previousTotal(type) > 0 ? (currentTotal(type) - previousTotal(type)) / previousTotal(type) * 100 : null;
  const spark = (type: string) => Array.from({ length: view.days }, (_, i) => sumMoney(summary.transactions.filter(t => t.type === type && Number(t.date.slice(8)) === i + 1).map(t => t.amount)));
  const hasBudget = summary.total_budget > 0;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard title={view.current ? "Gastado este mes" : "Gastos del mes"} value={formatCurrency(summary.spent)} gradient="from-rose-500 to-pink-500" change={change('egreso')} positiveIsGood={false} spark={spark('egreso')} sparkColor="#f43f5e" footer={view.label} sparkLabel={`Gastos diarios de ${view.label}`} icon={TrendingDown} />
      <StatCard title="Ingresos" value={formatCurrency(summary.income)} gradient="from-emerald-500 to-teal-400" change={change('ingreso')} spark={spark('ingreso')} sparkColor="#10b981" footer={view.label} sparkLabel={`Ingresos diarios de ${view.label}`} icon={TrendingUp} />
      <StatCard title="Presupuesto" value={hasBudget ? formatCurrency(summary.total_budget) : 'Sin configurar'} gradient="from-teal-600 to-cyan-500" icon={Wallet}
        footer={!view.current ? <span>{hasBudget ? `${summary.pct_used}% utilizado · ` : ""}{view.label}</span> : hasBudget ? <span>{summary.pct_used}% utilizado · <Link href="/budget" className="font-semibold text-primary underline">Ver detalle</Link></span> : <Link href="/budget" className="font-semibold text-primary underline">Configurar presupuesto →</Link>} />
      <StatCard title="Restante" value={formatCurrency(summary.remaining)} gradient="from-sky-500 to-cyan-400" footer="Ingresos menos gastos del mes" icon={PiggyBank} negative={summary.remaining < 0} />
    </div>
  );
}

async function ChartSection({ view }: { view: MonthView }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date(view.start + "T12:00:00");
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
    .gte("date", start)
    .lte("date", view.end);

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
        <CardDescription>6 meses hasta {view.label}</CardDescription>
      </CardHeader>
      <CardContent>
        <IncomeExpenseChart data={data} />
      </CardContent>
    </Card>
  );
}

async function BreakdownSection({ view }: { view: MonthView }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date(view.start + "T12:00:00");
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
            No hay gastos en {view.label}.
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

async function RecentSection({ view }: { view: MonthView }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: txs } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("user_id", user.id)
    .gte("date", view.start)
    .lte("date", view.end)
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
          <RecentTransactions transactions={(txs as Transaction[]) ?? []} month={view.value} />
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <ArrowDownRight className="mx-auto mb-2 h-8 w-8 opacity-40" />
            No hay transacciones en {view.label}.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function BudgetDetailSection({ view }: { view: MonthView }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { month, year } = view;
  const now = new Date(view.start + "T12:00:00");
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
        <CardDescription>{view.label}</CardDescription>
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
