import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient, getUserFast } from "@/lib/supabase/server";
import { sendBudgetAlert } from "@/lib/resend";
import { formatCurrency, todayLocal, toLocalDateString } from "@/lib/utils";

async function streamGemini(
  systemPrompt: string,
  message: string,
  imageBase64: string | null | undefined,
  onToken: (token: string) => void
): Promise<string> {
  const text =
    message?.trim() ||
    (imageBase64
      ? "Lee este comprobante y registra el gasto correspondiente."
      : "");

  const parts: any[] = [];
  if (text) parts.push({ text });
  if (imageBase64) {
    const { mime, data } = parseDataUrl(imageBase64);
    parts.push({ inlineData: { mimeType: mime, data } });
  }
  if (parts.length === 0) parts.push({ text: "Hola" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta la variable de entorno GEMINI_API_KEY. Agrégala en tu .env.local."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0,
      thinkingConfig: { thinkingBudget: 128 },
    } as any,
  });

  const result = await model.generateContentStream({
    contents: [{ role: "user", parts }],
  });

  let full = "";
  for await (const chunk of result.stream) {
    const delta = chunk.text();
    if (delta) {
      full += delta;
      onToken(delta);
    }
  }
  return full;
}

function parseDataUrl(value: string): { mime: string; data: string } {
  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/s);
  if (match) {
    return { mime: match[1], data: match[2] };
  }
  return { mime: "image/jpeg", data: value };
}

function extractJson(text: string): any | null {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* intenta extraer el primer objeto JSON del texto */
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * Determina la fecha de una transacción a partir del mensaje del usuario.
 * Gemini suele inventar fechas (ej. 2024-05-20), así que NUNCA confiamos
 * en la fecha que el modelo devuelve; solo en lo que el usuario escribió.
 * Si no hay fecha explícita, se usa hoy.
 */
function resolveTransactionDate(message: string, localDate?: string | null): string {
  const m = (message ?? "").toLowerCase().trim();
  // Usa la fecha local del usuario si viene del cliente; si no, la del servidor.
  const today =
    localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)
      ? localDate
      : todayLocal();
  if (!m) return today;

  // YYYY-MM-DD o YYYY/MM/DD
  const iso = m.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    if (!Number.isNaN(d.getTime())) return toLocalDateString(d);
  }

  // DD/MM/YYYY o DD-MM-YYYY
  const dmy = m.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (dmy) {
    const d = new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
    if (!Number.isNaN(d.getTime())) return toLocalDateString(d);
  }

  // hoy
  if (/\bhoy\b/.test(m)) return today;

  // ayer / anteayer
  if (/\banteayer\b/.test(m)) {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return toLocalDateString(d);
  }
  if (/\bayer\b/.test(m)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toLocalDateString(d);
  }

  return today;
}

async function getTopCategories(
  supabase: any,
  userId: string,
  start: string,
  end: string
) {
  const { data: txs } = await supabase
    .from("transactions")
    .select("amount, category:categories(name, icon)")
    .eq("user_id", userId)
    .eq("type", "egreso")
    .gte("date", start)
    .lte("date", end);

  const grouped = new Map<string, { name: string; icon: string; amount: number }>();
  for (const t of txs ?? []) {
    const name = t.category?.name ?? "Sin categoría";
    const icon = t.category?.icon ?? "📌";
    const existing = grouped.get(name);
    if (existing) existing.amount += Number(t.amount);
    else grouped.set(name, { name, icon, amount: Number(t.amount) });
  }
  return Array.from(grouped.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const user = await getUserFast();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { message, imageBase64, localDate } = await request.json().catch(() => ({
      message: "",
      imageBase64: null,
      localDate: null,
    }));

    if (!message?.trim() && !imageBase64) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0);
    const end = `${year}-${String(month).padStart(2, "0")}-${String(
      endDate.getDate()
    ).padStart(2, "0")}`;

    const [{ data: profile }, { data: budget }, { data: txs }, { data: categories }] =
      await Promise.all([
        supabase.from("profiles").select("name, email").eq("id", user.id).single(),
        supabase
          .from("budgets")
          .select("*")
          .eq("user_id", user.id)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle(),
        supabase
          .from("transactions")
          .select("type, amount")
          .eq("user_id", user.id)
          .gte("date", start)
          .lte("date", end),
        supabase.from("categories").select("*").eq("user_id", user.id),
      ]);

    const spent = (txs ?? [])
      .filter((t) => t.type === "egreso")
      .reduce((a, t) => a + Number(t.amount), 0);
    const income = (txs ?? [])
      .filter((t) => t.type === "ingreso")
      .reduce((a, t) => a + Number(t.amount), 0);

    const total = Number(budget?.total ?? 0);
    const remaining = total - spent;
    const pct = total > 0 ? Math.round((spent / total) * 100) : 0;

    const catList = (categories ?? [])
      .map((c: any) => `${c.name}=${c.id}`)
      .join("\n");

    const systemPrompt = `Eres Bille, asistente financiero personal de ${profile?.name ?? "usuario"} (solo finanzas personales).
Presupuesto: ${formatCurrency(total)} · Gastado: ${formatCurrency(spent)} · Ingresos: ${formatCurrency(income)} · Restante: ${formatCurrency(remaining)}.

Categorías (usa el id exacto):
${catList}

Reglas:
- Si el usuario menciona un gasto/pago/ingreso o sube un comprobante, responde SOLO con este JSON (sin markdown ni texto extra):
{"action":"add_transaction","type":"egreso","category_id":"<id>","amount":0.00,"detail":"descripción","payment_method":"Efectivo","date":"YYYY-MM-DD","message":"✓ Registré S/ X.XX — detalle"}
- type: "egreso" o "ingreso". amount: número sin símbolo. date: si no la dice, usa hoy.
- payment_method: Efectivo, Débito, Crédito, Transferencia, Yape/Plin u Otro.
- NUNCA preguntes: elige tú la categoría más parecida y responde el JSON directo.
- Para preguntas o análisis, responde en texto breve y amigable en español peruano.`;

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let fullText = "";
        let started = false;
        let isJson = false;
        let didStream = false;

        try {
          fullText = await streamGemini(
            systemPrompt,
            message ?? "",
            imageBase64,
            (token) => {
              // Detecta en el primer token si la respuesta es JSON (transacción)
              // o texto libre. El texto libre se muestra en vivo (streaming).
              if (!started) {
                const first = token.trimStart().charAt(0);
                if (first) {
                  started = true;
                  isJson = first === "{";
                }
              }
              if (!isJson) {
                didStream = true;
                controller.enqueue(encoder.encode(token));
              }
            }
          );
        } catch (err: any) {
          const msg = String(
            err?.message ?? "Ocurrió un error al procesar tu solicitud. Inténtalo de nuevo."
          );
          controller.enqueue(encoder.encode(`⚠️ ${msg}`));
          controller.close();
          return;
        }

        const json = extractJson(fullText);

        if (json && json.action === "add_transaction") {
          const amount = Number(json.amount);
          if (!amount || amount <= 0 || Number.isNaN(amount)) {
            controller.enqueue(encoder.encode(fullText));
            controller.close();
            return;
          }

          const validType = ["ingreso", "egreso", "ahorro"].includes(json.type)
            ? json.type
            : "egreso";

          let category = (categories ?? []).find((c: any) => c.id === json.category_id);
          if (!category) {
            category = (categories ?? []).find(
              (c: any) =>
                c.name.toLowerCase() ===
                String(json.category_name ?? "").toLowerCase()
            );
          }
          if (!category) {
            category = (categories ?? []).find(
              (c: any) => c.type === validType || c.type === "ambos"
            );
          }
          if (!category) {
            category = (categories ?? []).find((c: any) => c.type === "egreso");
          }
          const validPayment = [
            "Efectivo",
            "Débito",
            "Crédito",
            "Transferencia",
            "Yape/Plin",
            "Otro",
          ].includes(json.payment_method)
            ? json.payment_method
            : "Efectivo";

          const { data: tx, error } = await supabase
            .from("transactions")
            .insert({
              user_id: user.id,
              category_id: category?.id ?? null,
              type: validType,
              amount,
              detail: json.detail ?? "",
              bank: json.bank ?? "",
              payment_method: validPayment,
              owner: json.owner ?? "",
              ai_extracted: true,
              date: resolveTransactionDate(message ?? "", localDate),
            })
            .select("*, category:categories(*)")
            .single();

          if (error) {
            console.error("Chat: no se pudo registrar la transacción", error);
            controller.enqueue(
              encoder.encode(
                `⚠️ No se pudo registrar la transacción: ${error.message}`
              )
            );
            controller.close();
            return;
          }

          // Pre-calcular si corresponde enviar alerta de presupuesto
          let willAlert = false;
          let alertTo = "";
          let newRemaining = 0;
          let pctLeft = 0;
          if (total > 0 && budget) {
            newRemaining = total - (spent + amount);
            pctLeft = Math.round((newRemaining / total) * 100);
            const threshold = budget.alert_threshold_pct ?? 20;
            alertTo = budget.alert_email ?? profile?.email ?? "";
            willAlert = !!alertTo && pctLeft < threshold;
          }

          const confirmMessage =
            json.message ??
            `✓ Registré ${formatCurrency(amount)} en ${
              category?.name ?? "sin categoría"
            } — ${json.detail ?? ""}`;

          controller.enqueue(
            encoder.encode(
              confirmMessage +
                (willAlert
                  ? " 📧 Te enviaré una alerta de presupuesto por correo."
                  : "")
            )
          );
          controller.enqueue(
            encoder.encode(
              `\n\n__FINAL_JSON__${JSON.stringify({ transaction: tx })}`
            )
          );

          // Cerrar el stream ANTES de enviar la alerta: la respuesta al
          // usuario no debe esperar al email (que puede fallar o tardar).
          controller.close();

          // El envío de alerta se hace en segundo plano y NUNCA bloquea
          // la respuesta ya emitida.
          if (willAlert) {
            try {
              await sendBudgetAlert(alertTo, {
                name: profile?.name ?? "",
                subject: "⚠️ Tu presupuesto está bajo — Bille",
                budgetRemaining: newRemaining,
                budgetPctLeft: pctLeft,
                topCategories: await getTopCategories(supabase, user.id, start, end),
              });
              await supabase.from("alert_history").insert({
                user_id: user.id,
                type: "budget_low",
                subject: "Presupuesto bajo",
                sent_to: alertTo,
                budget_remaining: newRemaining,
                budget_pct_left: pctLeft,
                success: true,
              });
            } catch {
              await supabase.from("alert_history").insert({
                user_id: user.id,
                type: "budget_low",
                subject: "Presupuesto bajo",
                sent_to: alertTo,
                budget_remaining: newRemaining,
                budget_pct_left: pctLeft,
                success: false,
              });
            }
          }

          return;
        }

        // Si no fue JSON, ya se transmitió en vivo (streaming).
        // Solo enviamos el texto completo si nunca se transmitió nada.
        if (!didStream && fullText.trim()) {
          controller.enqueue(encoder.encode(fullText.trim()));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error: any) {
    const msg = String(error?.message ?? "");

    if (error?.status === 401 || msg.includes("API key not valid")) {
      return NextResponse.json(
        { error: "API key de Gemini inválida. Revisa GEMINI_API_KEY en tu .env.local." },
        { status: 500 }
      );
    }

    if (
      error?.status === 429 ||
      msg.includes("429") ||
      msg.includes("quota") ||
      msg.includes("insufficient") ||
      msg.includes("RESOURCE_EXHAUSTED")
    ) {
      return NextResponse.json(
        {
          error:
            "Límite de uso de Gemini alcanzado. Revisa tu plan o método de pago en aistudio.google.com.",
        },
        { status: 429 }
      );
    }

    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al procesar tu solicitud. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
