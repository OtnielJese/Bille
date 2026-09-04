import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUserFast } from "@/lib/supabase/server";

const updateSchema = z.object({
  type: z.enum(["ingreso", "egreso", "ahorro"]).optional(),
  amount: z.number().positive().optional(),
  category_id: z.string().uuid().nullable().optional(),
  detail: z.string().optional().nullable(),
  bank: z.string().optional().nullable(),
  payment_method: z
    .enum(["Efectivo", "Débito", "Crédito", "Transferencia", "Yape/Plin", "Otro"])
    .optional(),
  owner: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data, error } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
  }

  if (data.receipt_url) {
    const { data: signed } = await supabase.storage
      .from("receipts")
      .createSignedUrl(data.receipt_url, 3600);
    data.receipt_url = signed?.signedUrl ?? data.receipt_url;
  }

  return NextResponse.json({ transaction: data });
}

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
    .from("transactions")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("*, category:categories(*)")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Transacción no encontrada" },
      { status: error ? 500 : 404 }
    );
  }

  return NextResponse.json({ transaction: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: existing } = await supabase
    .from("transactions")
    .select("receipt_url")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (existing?.receipt_url) {
    await supabase.storage.from("receipts").remove([existing.receipt_url]);
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
