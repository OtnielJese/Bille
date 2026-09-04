import { NextResponse } from "next/server";
import { getUserFast } from "@/lib/supabase/server";
import { getGmailAuthUrl } from "@/lib/gmail";

export async function GET() {
  const user = await getUserFast();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  return NextResponse.redirect(getGmailAuthUrl());
}
