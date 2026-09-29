import { NextRequest, NextResponse } from "next/server";
import { getUserFast } from "@/lib/supabase/server";
import {
  exchangeCode,
  saveAccount,
  getAccountEmail,
  listAccounts,
  MAX_GMAIL_ACCOUNTS,
} from "@/lib/gmail";

export async function GET(request: NextRequest) {
  const user = await getUserFast();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const redirect = (query: string) => {
    const response = NextResponse.redirect(new URL('/integrations?' + query, appUrl));
    response.cookies.set('gmail_oauth_state', '', { path: '/api/gmail', maxAge: 0 });
    return response;
  };
  const state = request.nextUrl.searchParams.get('state');
  if (!state || request.cookies.get('gmail_oauth_state')?.value !== user.id + ':' + state) return redirect('error=1');
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return redirect("error=1");
  }

  try {
    const tokens = await exchangeCode(code);
    const email = await getAccountEmail(tokens.accessToken);

    const accounts = await listAccounts(user.id);
    const alreadyConnected = accounts.some((a) => a.email === email);

    if (!alreadyConnected && accounts.length >= MAX_GMAIL_ACCOUNTS) {
      return redirect("limit=1");
    }

    await saveAccount(user.id, { email, ...tokens });
    return redirect("connected=1");
  } catch {
    return redirect("error=1");
  }
}
