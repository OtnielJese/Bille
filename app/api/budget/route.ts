import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUserFast } from "@/lib/supabase/server";
import { getCurrentMonthYear } from "@/lib/utils";
import { loadFinancialSummary } from "@/lib/financial-summary";

const budgetSchema = z.object({
  total: z.number().finite().min(0).max(9999999999.99).multipleOf(0.01),
  savings_goal: z.number().finite().min(0).max(9999999999.99).multipleOf(0.01).optional(),
  alert_email: z.string().email().optional().nullable(),
  alert_threshold_pct: z.number().int().min(1).max(100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
});

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const history = sp.get("history") === "true";

  if (history) {
    const { data: budgets, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(12);
    if (error) return NextResponse.json({ error: "No se pudo cargar el historial." }, { status: 500 });

    const result = [];
    for (const budget of budgets ?? []) {
      const summary = await loadFinancialSummary(supabase, user.id, budget.month, budget.year);
      result.push({ ...budget, total: summary.total_budget, spent: summary.spent, pct_used: summary.pct_used });
    }

    return NextResponse.json({ budgets: result });
  }

  const { month, year } = getCurrentMonthYear();
  const queryMonth = Number(sp.get("month") ?? month);
  const queryYear = Number(sp.get("year") ?? year);
  if (!Number.isInteger(queryMonth) || queryMonth < 1 || queryMonth > 12 || !Number.isInteger(queryYear) || queryYear < 2000 || queryYear > 2100) return NextResponse.json({ error: "Período inválido" }, { status: 400 });

  const summary = await loadFinancialSummary(
    supabase,
    user.id,
    Number.isNaN(queryMonth) ? month : queryMonth,
    Number.isNaN(queryYear) ? year : queryYear
  );

  const { transactions, ...publicSummary } = summary;
  return NextResponse.json(publicSummary);
}

export async function POST(request: NextRequest) {
  return upsert(request);
}

export async function PUT(request: NextRequest) {
  return upsert(request);
}

async function upsert(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = budgetSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { month: defaultMonth, year: defaultYear } = getCurrentMonthYear();
  const month = parsed.data.month ?? defaultMonth;
  const year = parsed.data.year ?? defaultYear;

  const payload = {
    user_id: user.id,
    month,
    year,
    total: parsed.data.total,
    savings_goal: parsed.data.savings_goal ?? 0,
    alert_email: parsed.data.alert_email ?? null,
    alert_threshold_pct: parsed.data.alert_threshold_pct ?? 20,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("budgets")
    .upsert(payload, { onConflict: "user_id,month,year" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ budget: data });
}
