import { NextResponse } from "next/server";
import { createClient, getUserFast } from "@/lib/supabase/server";
import {
  listBankMessages,
  getMessage,
  extractEmailText,
  bankQuery,
  listAccounts,
  getValidAccessTokenForAccount,
  markSynced,
} from "@/lib/gmail";
import { generateText, extractJson } from "@/lib/ai";
import { todayLocal } from "@/lib/utils";

const EXTRACTION_PROMPT = `Eres Bille, asistente financiero. Extrae la transacción del siguiente correo bancario y responde ÚNICAMENTE con este JSON (sin markdown ni texto adicional):
{"action":"add_transaction","type":"egreso","amount":0.00,"detail":"descripción corta","bank":"nombre del banco","payment_method":"Transferencia","date":"YYYY-MM-DD","message":"✓ Registré S/ X.XX — descripción"}

Reglas:
- "type": "egreso" para pagos, compras o transferencias enviadas; "ingreso" para depósitos o transferencias recibidas.
- "amount": número sin símbolo de moneda. Ej: 8.00
- "payment_method": uno de Efectivo, Débito, Crédito, Transferencia, Yape/Plin, Otro.
- "date" en formato YYYY-MM-DD.
- Si el correo NO es una transacción (publicidad, avisos, recordatorios), responde {"action":"none"}.`;

/** Ejecuta tareas en paralelo con un límite de concurrencia. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function POST() {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const accounts = await listAccounts(user.id);
    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "Conecta Gmail primero" },
        { status: 400 }
      );
    }

    const { data: categories } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id);

    let created = 0;
    let skipped = 0;
    let errors = 0;
    const createdTx: { type: string; amount: number; detail: string }[] = [];

    // 1) Obtener los IDs de correos de todas las cuentas en paralelo.
    const perAccount: { account: any; accessToken: string; messages: { id: string }[] }[] = [];

    await mapWithConcurrency(accounts, 3, async (account) => {
      let accessToken: string;
      try {
        accessToken = await getValidAccessTokenForAccount(account);
      } catch {
        errors++;
        return;
      }
      try {
        const messages = await listBankMessages(accessToken, bankQuery(), 20);
        perAccount.push({ account, accessToken, messages });
      } catch {
        errors++;
      }
    });

    // 2) Consultar de una sola vez qué correos ya fueron procesados.
    const allIds = perAccount.flatMap((p) => p.messages.map((m) => m.id));
    const existingIds = new Set<string>();
    if (allIds.length > 0) {
      const { data: processed } = await supabase
        .from("transactions")
        .select("email_id")
        .eq("user_id", user.id)
        .in("email_id", allIds);
      for (const row of processed ?? []) {
        if (row.email_id) existingIds.add(row.email_id);
      }
    }

    // 3) Procesar solo los correos nuevos, en paralelo.
    const tasks: { accessToken: string; id: string }[] = [];
    for (const p of perAccount) {
      for (const m of p.messages) {
        if (!existingIds.has(m.id)) {
          tasks.push({ accessToken: p.accessToken, id: m.id });
        } else {
          skipped++;
        }
      }
    }

    await mapWithConcurrency(tasks, 4, async ({ accessToken, id }) => {
      try {
        const msg = await getMessage(accessToken, id);
        const text = extractEmailText(msg);
        if (!text || text.length < 20) {
          skipped++;
          return;
        }

        const raw = await generateText(EXTRACTION_PROMPT, text);
        const json = extractJson(raw);
        if (!json || json.action !== "add_transaction") {
          skipped++;
          return;
        }

        const amount = Number(json.amount);
        if (!amount || amount <= 0 || Number.isNaN(amount)) {
          skipped++;
          return;
        }

        const category = (categories ?? []).find(
          (c: any) =>
            c.name.toLowerCase() ===
            String(json.category_name ?? "").toLowerCase()
        );
        const validType = ["ingreso", "egreso", "ahorro"].includes(json.type)
          ? json.type
          : "egreso";
        const validPayment = [
          "Efectivo",
          "Débito",
          "Crédito",
          "Transferencia",
          "Yape/Plin",
          "Otro",
        ].includes(json.payment_method)
          ? json.payment_method
          : "Transferencia";

        const { error } = await supabase.from("transactions").insert({
          user_id: user.id,
          category_id: category?.id ?? null,
          type: validType,
          amount,
          detail: json.detail ?? "",
          bank: json.bank ?? "",
          payment_method: validPayment,
          ai_extracted: true,
          email_id: id,
          date: /^\d{4}-\d{2}-\d{2}$/.test(json.date ?? "")
            ? json.date
            : todayLocal(),
        });

        if (error) errors++;
        else {
          created++;
          createdTx.push({
            type: validType,
            amount,
            detail: json.detail ?? "",
          });
        }
      } catch {
        errors++;
      }
    });

    // 4) Actualizar la última sincronización de cada cuenta (siempre).
    await mapWithConcurrency(
      perAccount,
      3,
      async (p) => {
        await markSynced(user.id, p.account.id);
      }
    );

    return NextResponse.json({
      created,
      skipped,
      errors,
      transactions: createdTx,
      synced_at: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("Gmail sync error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Error al sincronizar los correos" },
      { status: 500 }
    );
  }
}
