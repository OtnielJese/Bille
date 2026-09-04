import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUserFast } from "@/lib/supabase/server";

const updateSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  icon: z.string().max(8).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  type: z.enum(["ingreso", "egreso", "ambos"]).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Categoría no encontrada" },
      { status: error ? 500 : 404 }
    );
  }

  return NextResponse.json({ category: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("category_id", params.id)
    .eq("user_id", user.id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "No puedes eliminar esta categoría porque tiene transacciones asociadas.",
      },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
