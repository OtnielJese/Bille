import { NextRequest, NextResponse } from "next/server";
import { createClient, getUserFast } from "@/lib/supabase/server";
import {
  exchangeCode,
  saveAccount,
  getAccountEmail,
  listAccounts,
  MAX_GMAIL_ACCOUNTS,
} from "@/lib/gmail";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/integrations?error=1", appUrl));
  }

  try {
    const tokens = await exchangeCode(code);
    const email = await getAccountEmail(tokens.accessToken);

    const accounts = await listAccounts(user.id);
    const alreadyConnected = accounts.some((a) => a.email === email);

    if (!alreadyConnected && accounts.length >= MAX_GMAIL_ACCOUNTS) {
      return NextResponse.redirect(new URL("/integrations?limit=1", appUrl));
    }

    await saveAccount(user.id, { email, ...tokens });
    return NextResponse.redirect(new URL("/integrations?connected=1", appUrl));
  } catch {
    return NextResponse.redirect(new URL("/integrations?error=1", appUrl));
  }
}
