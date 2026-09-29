import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getUserFast } from "@/lib/supabase/server";
import { getGmailAuthUrl } from "@/lib/gmail";

export async function GET() {
  const user = await getUserFast();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const state = randomBytes(32).toString('hex');
  const response = NextResponse.redirect(getGmailAuthUrl(state));
  response.cookies.set('gmail_oauth_state', user.id + ':' + state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/gmail', maxAge: 600 });
  return response;
}
