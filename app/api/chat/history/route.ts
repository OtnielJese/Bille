import { NextRequest, NextResponse } from "next/server";
import { createClient, getUserFast } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { role, content } = await request.json().catch(() => ({}));
  if ((role !== "user" && role !== "assistant") || !content) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { error } = await supabase
    .from("chat_messages")
    .insert({ user_id: user.id, role, content });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
