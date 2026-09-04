"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency, getMonthName } from "@/lib/utils";
import { toast } from "sonner";

const budgetSchema = z.object({
  total: z.number().min(0, "Ingresa un monto válido"),
  savings_goal: z.number().min(0).optional(),
  alert_email: z
    .string()
    .email("Correo inválido")
    .optional()
    .or(z.literal("")),
  alert_threshold_pct: z.number().min(1).max(100),
});

interface Summary {
  budget: any;
  spent: number;
  income: number;
  savings: number;
  remaining: number;
  pct_used: number;
}

interface HistoryItem {
  id: string;
  month: number;
  year: number;
  total: number;
  spent: number;
  pct_used: number;
}

interface CatBudgetItem {
  category: { id: string; name: string; icon: string; color: string };
  amount: number;
  spent: number;
}

export default function BudgetPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [total, setTotal] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [threshold, setThreshold] = useState(20);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catItems, setCatItems] = useState<CatBudgetItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, histRes, catRes] = await Promise.all([
        fetch("/api/budget"),
        fetch("/api/budget?history=true"),
        fetch("/api/category-budgets"),
      ]);
      const sum = await sumRes.json();
      const hist = await histRes.json();
      const cat = await catRes.json();

      setSummary(sum);
      setHistory(hist.budgets ?? []);
      setCatItems(cat.items ?? []);
      setTotal(sum.budget ? String(Number(sum.budget.total)) : "");
      setSavingsGoal(
        sum.budget ? String(Number(sum.budget.savings_goal ?? 0)) : ""
      );
      setAlertEmail(sum.budget?.alert_email ?? "");
      setThreshold(sum.budget?.alert_threshold_pct ?? 20);
    } catch {
      toast.error("No se pudo cargar el presupuesto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = budgetSchema.safeParse({
      total: parseFloat(total || "0"),
      savings_goal: parseFloat(savingsGoal || "0"),
      alert_email: alertEmail || "",
      alert_threshold_pct: threshold,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          alert_email: parsed.data.alert_email || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");

      toast.success("Presupuesto guardado");
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar el presupuesto");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCategoryBudget(categoryId: string, amount: number) {
    try {
      const res = await fetch("/api/category-budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: categoryId, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      toast.success("Presupuesto de categoría guardado");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const spent = summary?.spent ?? 0;
  const remaining = summary?.remaining ?? 0;
  const pctUsed = summary?.pct_used ?? 0;
  const savingsGoalNum = Number(summary?.budget?.savings_goal ?? 0);
  const surplus = remaining >= 0;

  const progressColor =
    pctUsed > 90 ? "bg-red-500" : pctUsed > 70 ? "bg-amber-500" : "bg-teal-600";

  return (
    <div className="space-y-6">
      {/* Progreso */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen del mes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Gastado</p>
              <p className="text-3xl font-bold">{formatCurrency(spent)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Presupuesto</p>
              <p className="text-xl font-semibold">
                {formatCurrency(Number(summary?.budget?.total ?? 0))}
              </p>
            </div>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", progressColor)}
              style={{ width: `${Math.min(100, pctUsed)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {pctUsed}% del presupuesto utilizado
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniCard
              icon={TrendingDown}
              label="Gastado"
              value={formatCurrency(spent)}
              color="#ef4444"
            />
            <MiniCard
              icon={Wallet}
              label="Restante"
              value={formatCurrency(remaining)}
              color={surplus ? "#10b981" : "#ef4444"}
            />
            <MiniCard
              icon={PiggyBank}
              label="Meta de ahorro"
              value={formatCurrency(savingsGoalNum)}
              color="#3b82f6"
            />
            <MiniCard
              icon={surplus ? TrendingUp : TrendingDown}
              label={surplus ? "Superávit" : "Déficit"}
              value={formatCurrency(Math.abs(remaining))}
              color={surplus ? "#22c55e" : "#ef4444"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Configurar presupuesto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Presupuesto total mensual</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    S/
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Meta de ahorro</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    S/
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={savingsGoal}
                    onChange={(e) => setSavingsGoal(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email de alertas</Label>
                <Input
                  type="email"
                  placeholder="tu@correo.com"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Umbral de alerta: {threshold}%</Label>
                <Input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
                  className="accent-[#0d9488]"
                />
                <p className="text-xs text-muted-foreground">
                  Te avisaremos cuando te quede menos del {threshold}% del presupuesto.
                </p>
              </div>
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Presupuesto por categoría */}
      <Card>
        <CardHeader>
          <CardTitle>Presupuesto por categoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {catItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Crea categorías para asignarles un presupuesto mensual (ej. comida
              S/ 300, gasolina S/ 200).
            </p>
          ) : (
            catItems.map((item) => (
              <div
                key={item.category.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                  style={{ backgroundColor: `${item.category.color}1a` }}
                >
                  {item.category.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.category.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Gastado: {formatCurrency(item.spent)} · Presupuesto:{" "}
                    {formatCurrency(item.amount)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      S/
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amount || ""}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setCatItems((prev) =>
                          prev.map((it) =>
                            it.category.id === item.category.id
                              ? { ...it, amount: v }
                              : it
                          )
                        );
                      }}
                      className="w-24 pl-7"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleSaveCategoryBudget(item.category.id, item.amount)
                    }
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de presupuestos</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay presupuestos anteriores.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Gastado</TableHead>
                    <TableHead>% usado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        {getMonthName(h.month)} {h.year}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(h.total))}</TableCell>
                      <TableCell>{formatCurrency(h.spent)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-semibold",
                            h.pct_used > 90
                              ? "text-red-500"
                              : h.pct_used > 70
                                ? "text-amber-500"
                                : "text-emerald-600"
                          )}
                        >
                          {h.pct_used}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-4">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
