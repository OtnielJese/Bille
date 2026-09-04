import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUserFast } from "@/lib/supabase/server";
import { getCurrentMonthYear } from "@/lib/utils";

const budgetSchema = z.object({
  total: z.number().min(0),
  savings_goal: z.number().min(0).optional(),
  alert_email: z.string().email().optional().nullable(),
  alert_threshold_pct: z.number().min(1).max(100).optional(),
  month: z.number().min(1).max(12).optional(),
  year: z.number().optional(),
});

async function computeMonth(
  supabase: any,
  userId: string,
  month: number,
  year: number
) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${year}-${String(month).padStart(2, "0")}-${String(
    endDate.getDate()
  ).padStart(2, "0")}`;

  const { data: budget } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  const { data: txs } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);

  let spent = 0;
  let income = 0;
  let savings = 0;
  for (const t of txs ?? []) {
    const amt = Number(t.amount);
    if (t.type === "egreso") spent += amt;
    else if (t.type === "ingreso") income += amt;
    else if (t.type === "ahorro") savings += amt;
  }

  const total = Number(budget?.total ?? 0);
  const remaining = total - spent;
  const pctUsed = total > 0 ? Math.round((spent / total) * 100) : 0;

  return {
    budget,
    spent,
    income,
    savings,
    remaining,
    pct_used: pctUsed,
  };
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const history = sp.get("history") === "true";

  if (history) {
    const { data: budgets } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    // gastado de los últimos 12 meses
    const start = `${new Date().getFullYear() - 1}-01-01`;
    const { data: txs } = await supabase
      .from("transactions")
      .select("type, amount, date")
      .eq("user_id", user.id)
      .gte("date", start);

    const spentByMonth: Record<string, number> = {};
    for (const t of txs ?? []) {
      if (t.type !== "egreso") continue;
      const key = t.date.slice(0, 7); // YYYY-MM
      spentByMonth[key] = (spentByMonth[key] ?? 0) + Number(t.amount);
    }

    const result = (budgets ?? []).map((b: any) => {
      const spent = spentByMonth[`${b.year}-${String(b.month).padStart(2, "0")}`] ?? 0;
      const total = Number(b.total);
      return {
        ...b,
        spent,
        pct_used: total > 0 ? Math.round((spent / total) * 100) : 0,
      };
    });

    return NextResponse.json({ budgets: result });
  }

  const { month, year } = getCurrentMonthYear();
  const queryMonth = parseInt(sp.get("month") ?? String(month), 10);
  const queryYear = parseInt(sp.get("year") ?? String(year), 10);

  const summary = await computeMonth(
    supabase,
    user.id,
    Number.isNaN(queryMonth) ? month : queryMonth,
    Number.isNaN(queryYear) ? year : queryYear
  );

  return NextResponse.json(summary);
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
