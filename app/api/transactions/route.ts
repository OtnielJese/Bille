import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUserFast } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/utils";

const transactionSchema = z.object({
  type: z.enum(["ingreso", "egreso", "ahorro"]),
  amount: z.number().positive(),
  category_id: z.string().uuid().nullable().optional(),
  detail: z.string().optional().nullable(),
  bank: z.string().optional().nullable(),
  payment_method: z
    .enum(["Efectivo", "Débito", "Crédito", "Transferencia", "Yape/Plin", "Otro"])
    .default("Efectivo"),
  owner: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  imageBase64: z.string().optional().nullable(),
});

function parseImage(base64: string) {
  const match = base64.match(/^data:(image\/(png|jpeg|webp));base64,(.*)$/s);
  if (match) {
    return {
      buffer: Buffer.from(match[3], "base64"),
      mime: match[1],
      ext: match[2] === "png" ? "png" : match[2] === "webp" ? "webp" : "jpg",
    };
  }
  return { buffer: Buffer.from(base64, "base64"), mime: "image/jpeg", ext: "jpg" };
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("transactions")
    .select("*, category:categories(*)", { count: "exact" })
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const type = sp.get("type");
  if (type) query = query.eq("type", type);

  const categoryId = sp.get("category_id");
  if (categoryId) query = query.eq("category_id", categoryId);

  const dateFrom = sp.get("date_from");
  if (dateFrom) query = query.gte("date", dateFrom);

  const dateTo = sp.get("date_to");
  if (dateTo) query = query.lte("date", dateTo);

  const search = sp.get("search");
  if (search) query = query.ilike("detail", `%${search}%`);

  const { data, count, error } = await query.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const transactions = await Promise.all(
    (data ?? []).map(async (t: any) => {
      if (t.receipt_url) {
        const { data: signed } = await supabase.storage
          .from("receipts")
          .createSignedUrl(t.receipt_url, 3600);
        return { ...t, receipt_url: signed?.signedUrl ?? t.receipt_url };
      }
      return t;
    })
  );

  return NextResponse.json({
    transactions,
    total: count ?? 0,
    page,
    limit,
  });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { imageBase64, ...rest } = parsed.data;
  const payload: Record<string, any> = {
    ...rest,
    user_id: user.id,
    date: rest.date ?? todayLocal(),
  };

  if (imageBase64) {
    const { buffer, mime, ext } = parseImage(imageBase64);
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { data: upload, error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(path, buffer, { contentType: mime, upsert: false });

    if (uploadError) {
      return NextResponse.json(
        { error: `No se pudo subir el comprobante: ${uploadError.message}` },
        { status: 500 }
      );
    }
    payload.receipt_url = upload.path;
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert(payload)
    .select("*, category:categories(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data?.receipt_url) {
    const { data: signed } = await supabase.storage
      .from("receipts")
      .createSignedUrl(data.receipt_url, 3600);
    data.receipt_url = signed?.signedUrl ?? data.receipt_url;
  }

  return NextResponse.json({ transaction: data }, { status: 201 });
}
