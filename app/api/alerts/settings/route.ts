import { NextRequest, NextResponse } from "next/server";
import { createClient, getUserFast } from "@/lib/supabase/server";

const VALID_PERIODS = ["diaria", "semanal", "quincenal", "mensual"];

export async function GET() {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data } = await supabase
    .from("alert_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    settings: data ?? { spend_limit: 100, period: "diaria", enabled: true },
  });
}

export async function PUT(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const spend_limit = Number(body?.spend_limit ?? 100);
  const period = VALID_PERIODS.includes(body?.period) ? body.period : "diaria";
  const enabled = body?.enabled !== false;

  if (!spend_limit || spend_limit <= 0 || Number.isNaN(spend_limit)) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("alert_settings")
    .upsert(
      {
        user_id: user.id,
        spend_limit,
        period,
        enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
