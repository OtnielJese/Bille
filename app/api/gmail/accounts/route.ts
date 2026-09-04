import { NextRequest, NextResponse } from "next/server";
import { createClient, getUserFast } from "@/lib/supabase/server";
import { listAccounts, deleteAccount, MAX_GMAIL_ACCOUNTS } from "@/lib/gmail";

export async function GET() {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const accounts = await listAccounts(user.id);
  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      email: a.email,
      last_synced_at: a.last_synced_at,
    })),
    max: MAX_GMAIL_ACCOUNTS,
  });
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });

  try {
    await deleteAccount(user.id, id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "No se pudo desvincular" },
      { status: 500 }
    );
  }
}
