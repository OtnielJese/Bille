import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createClient, getUserFast } from "@/lib/supabase/server";
import { getCurrentMonthYear } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const { month, year } = getCurrentMonthYear();
  const m = Number(sp.get("month") ?? month);
  const y = Number(sp.get("year") ?? year);
  if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 2000 || y > 2100) return NextResponse.json({ error: "Período inválido" }, { status: 400 });

  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = new Date(y, m, 0);
  const end = `${y}-${String(m).padStart(2, "0")}-${String(
    endDate.getDate()
  ).padStart(2, "0")}`;

  const [{ data: categories }, { data: budgets }, { data: txs }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      supabase
        .from("category_budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", m)
        .eq("year", y),
      supabase
        .from("transactions")
        .select("category_id, amount")
        .eq("user_id", user.id)
        .eq("type", "egreso")
        .gte("date", start)
        .lte("date", end),
    ]);

  const spentByCat = new Map<string, number>();
  for (const t of txs ?? []) {
    const id = t.category_id ?? "none";
    spentByCat.set(id, (spentByCat.get(id) ?? 0) + Number(t.amount));
  }

  const items = (categories ?? []).map((c: any) => {
    const b = (budgets ?? []).find((x: any) => x.category_id === c.id);
    return {
      category: c,
      amount: Number(b?.amount ?? 0),
      budget_id: b?.id ?? null,
      spent: spentByCat.get(c.id) ?? 0,
    };
  });

  return NextResponse.json({ items });
}

export async function PUT(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = z.object({ category_id: z.string().uuid(), amount: z.number().finite().min(0).max(9999999999.99).multipleOf(0.01), month: z.number().int().min(1).max(12).optional(), year: z.number().int().min(2000).max(2100).optional() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  const { category_id, amount, month, year } = parsed.data;
  const { data: category, error: categoryError } = await supabase.from('categories').select('id').eq('id', category_id).eq('user_id', user.id).maybeSingle();
  if (categoryError || !category) return NextResponse.json({ error: 'Categoría no disponible' }, { status: 400 });
  const { month: defMonth, year: defYear } = getCurrentMonthYear();
  const m = month ?? defMonth, y = year ?? defYear;

  const { data, error } = await supabase
    .from("category_budgets")
    .upsert(
      {
        user_id: user.id,
        category_id,
        month: m,
        year: y,
        amount: Number(amount),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,category_id,month,year" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
