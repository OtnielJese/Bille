import { createClient } from "@/lib/supabase/server";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.readonly";

export const MAX_GMAIL_ACCOUNTS = 3;

// Remitentes de bancos peruanos que sí procesamos
const BANK_SENDERS = [
  "bbva.com.pe",
  "bbva.pe",
  "bcp.com.pe",
  "interbank.com.pe",
  "interbank.pe",
  "scotiabank.com.pe",
  "bn.com.pe",
];

export function getGmailAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    include_granted_scopes: "true",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data?.error_description ?? data?.error ?? "Error al intercambiar el código"
    );
  }
  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string | undefined) ?? null,
    expiry: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
  };
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data?.error_description ?? data?.error ?? "Error al refrescar el token"
    );
  }
  return {
    accessToken: data.access_token as string,
    expiry: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
  };
}

export async function getAccountEmail(accessToken: string): Promise<string> {
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error("No se pudo obtener el correo de la cuenta");
  const data = await res.json();
  return data.emailAddress as string;
}

export async function listAccounts(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("gmail_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return (data as any[]) ?? [];
}

export async function saveAccount(
  userId: string,
  account: {
    email: string;
    accessToken: string;
    refreshToken?: string | null;
    expiry?: string | null;
  }
) {
  const supabase = createClient();
  const { error } = await supabase.from("gmail_accounts").upsert(
    {
      user_id: userId,
      email: account.email,
      access_token: account.accessToken,
      refresh_token: account.refreshToken ?? null,
      expiry: account.expiry ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,email" }
  );
  if (error) throw error;
}

export async function deleteAccount(userId: string, accountId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("gmail_accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function markSynced(userId: string, accountId: string) {
  const supabase = createClient();
  await supabase
    .from("gmail_accounts")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", accountId)
    .eq("user_id", userId);
}

export async function getValidAccessTokenForAccount(account: any): Promise<string> {
  if (!account?.access_token) throw new Error("Cuenta sin token de acceso");
  if (account.expiry && new Date(account.expiry).getTime() < Date.now()) {
    if (!account.refresh_token) {
      throw new Error("Token expirado y sin refresh token");
    }
    const refreshed = await refreshAccessToken(account.refresh_token);
    const supabase = createClient();
    await supabase
      .from("gmail_accounts")
      .update({
        access_token: refreshed.accessToken,
        expiry: refreshed.expiry,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);
    return refreshed.accessToken;
  }
  return account.access_token;
}

export function bankQuery(): string {
  return `from:(${BANK_SENDERS.join(" OR ")})`;
}

export async function listBankMessages(
  accessToken: string,
  query: string,
  maxResults = 20
) {
  const q = `${query} newer_than:7d`;
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail: error ${res.status} al listar correos`);
  const data = await res.json();
  return (data.messages ?? []) as { id: string }[];
}

export async function getMessage(accessToken: string, id: string) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail: error ${res.status} al leer correo`);
  return await res.json();
}

function decodeBase64Url(data: string): string {
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString("utf8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextFromPart(part: any): string {
  if (!part) return "";
  const mime = part.mimeType ?? "";

  if (mime === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  if (mime === "text/html" && part.body?.data) {
    return stripHtml(decodeBase64Url(part.body.data));
  }
  if (Array.isArray(part.parts)) {
    const plain = part.parts.find(
      (p: any) => p.mimeType === "text/plain" && p.body?.data
    );
    if (plain) return decodeBase64Url(plain.body.data);
    return part.parts.map((p: any) => extractTextFromPart(p)).join("\n");
  }
  return "";
}

export function extractEmailText(message: any): string {
  const payload = message?.payload;
  if (!payload) return "";
  return extractTextFromPart(payload).trim();
}
