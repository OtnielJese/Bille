import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUserFast } from "@/lib/supabase/server";

const categorySchema = z.object({
  name: z.string().min(1).max(40),
  icon: z.string().max(8).default("📌"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0d9488"),
  type: z.enum(["ingreso", "egreso", "ambos"]).default("egreso"),
});

export async function GET() {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [{ data: categories, error }, { data: txs }] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("transactions")
      .select("category_id")
      .eq("user_id", user.id),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  for (const t of txs ?? []) {
    if (!t.category_id) continue;
    counts[t.category_id] = (counts[t.category_id] ?? 0) + 1;
  }

  const result = (categories ?? []).map((c: any) => ({
    ...c,
    transaction_count: counts[c.id] ?? 0,
  }));

  return NextResponse.json({ categories: result });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = categorySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ ...parsed.data, user_id: user.id, is_default: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ category: data }, { status: 201 });
}
