import { NextRequest, NextResponse } from "next/server";
import { createClient, getUserFast } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name } = await request.json().catch(() => ({}));
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ name: String(name).trim(), updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, name: String(name).trim() });
}
