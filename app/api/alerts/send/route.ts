import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUserFast } from "@/lib/supabase/server";
import { sendBudgetAlert } from "@/lib/resend";
import { getCurrentMonthYear } from "@/lib/utils";

const alertSchema = z.object({
  type: z.enum(["test", "budget_low"]),
  budget_remaining: z.number().optional(),
  budget_pct_left: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = alertSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { month, year } = getCurrentMonthYear();
  const [{ data: profile }, { data: budget }] = await Promise.all([
    supabase.from("profiles").select("name, email").eq("id", user.id).single(),
    supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle(),
  ]);

  const to = budget?.alert_email ?? profile?.email ?? null;
  if (!to) {
    return NextResponse.json(
      { error: "No hay un correo configurado para alertas." },
      { status: 400 }
    );
  }

  const isTest = parsed.data.type === "test";

  // Top 3 categorías de gasto del mes
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const { data: txs } = await supabase
    .from("transactions")
    .select("amount, category:categories(name, icon)")
    .eq("user_id", user.id)
    .eq("type", "egreso")
    .gte("date", start);

  const grouped = new Map<string, { name: string; icon: string; amount: number }>();
  for (const t of txs ?? []) {
    const category = (t as any).category;
    const name = category?.name ?? "Sin categoría";
    const icon = category?.icon ?? "📌";
    const existing = grouped.get(name);
    if (existing) existing.amount += Number(t.amount);
    else grouped.set(name, { name, icon, amount: Number(t.amount) });
  }
  const topCategories = Array.from(grouped.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const budgetRemaining = isTest
    ? (parsed.data.budget_remaining ?? Number(budget?.total ?? 0))
    : (parsed.data.budget_remaining ?? 0);
  const budgetPctLeft = isTest
    ? (parsed.data.budget_pct_left ?? 100)
    : (parsed.data.budget_pct_left ?? 0);

  try {
    await sendBudgetAlert(to, {
      name: profile?.name ?? "",
      subject: isTest
        ? "🔔 Alerta de prueba — Bille"
        : "⚠️ Tu presupuesto está bajo — Bille",
      budgetRemaining,
      budgetPctLeft,
      topCategories,
    });

    const { data: saved } = await supabase
      .from("alert_history")
      .insert({
        user_id: user.id,
        type: isTest ? "test" : "budget_low",
        subject: isTest ? "Alerta de prueba" : "Presupuesto bajo",
        sent_to: to,
        budget_remaining: budgetRemaining,
        budget_pct_left: budgetPctLeft,
        success: true,
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      message: "Correo enviado correctamente.",
      alert: saved,
    });
  } catch (error: any) {
    await supabase.from("alert_history").insert({
      user_id: user.id,
      type: isTest ? "test" : "budget_low",
      subject: isTest ? "Alerta de prueba" : "Presupuesto bajo",
      sent_to: to,
      budget_remaining: budgetRemaining,
      budget_pct_left: budgetPctLeft,
      success: false,
    });

    return NextResponse.json(
      { error: `No se pudo enviar el correo: ${error?.message ?? "error desconocido"}` },
      { status: 500 }
    );
  }
}
