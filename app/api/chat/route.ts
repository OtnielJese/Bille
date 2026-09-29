import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient, getUserFast } from "@/lib/supabase/server";
import { evaluateAlerts } from "@/lib/alerts";
import { monthRange, resolveTransactionDate, isValidDate } from "@/lib/finance";
import { loadFinancialSummary } from "@/lib/financial-summary";
import { formatCurrency, todayLocal } from "@/lib/utils";
import { parseChatResponse } from "@/lib/chat-response";

async function generateGeminiResponse(
  systemPrompt: string,
  message: string,
  imageBase64: string | null | undefined
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

    if ((message != null && typeof message !== "string") || (imageBase64 != null && typeof imageBase64 !== "string") || (!message?.trim() && !imageBase64)) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    }

    const { month, year } = monthRange();
    const [summary, profileResult, categoryResult] = await Promise.all([
      loadFinancialSummary(supabase, user.id, month, year),
      supabase.from("profiles").select("name, email").eq("id", user.id).single(),
      supabase.from("categories").select("*").eq("user_id", user.id),
    ]);
    if (profileResult.error || categoryResult.error) throw new Error("No se pudo cargar el contexto financiero.");
    const profile = profileResult.data, categories = categoryResult.data;
    const { spent, income, remaining, total_budget: total } = summary;
    let transactionDate: string;
    try { transactionDate = resolveTransactionDate(message ?? "", localDate ?? todayLocal()); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }

    const catList = (categories ?? [])
      .map((c: any) => `${c.name}=${c.id}`)
      .join("\n");

    const systemPrompt = `Eres Bille, asistente financiero personal de ${profile?.name ?? "usuario"} (solo finanzas personales).
Presupuesto: ${formatCurrency(total)} · Gastado: ${formatCurrency(spent)} · Ingresos: ${formatCurrency(income)} · Saldo disponible (ingresos menos gastos del mes): ${formatCurrency(remaining)}.

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
        try {
          fullText = await generateGeminiResponse(systemPrompt, message ?? "", imageBase64);
        } catch (err: any) {
          const msg = String(
            err?.message ?? "Ocurrió un error al procesar tu solicitud. Inténtalo de nuevo."
          );
          controller.enqueue(encoder.encode(`⚠️ ${msg}`));
          controller.close();
          return;
        }

        const parsed = parseChatResponse(fullText);
        if (parsed.kind === "invalid") {
          controller.enqueue(encoder.encode("No pude interpretar el movimiento y no lo registré. Indica si es ingreso o gasto, el monto y una breve descripción."));
          controller.close();
          return;
        }

        if (parsed.kind === "transaction") {
          const json = parsed.transaction;
          const amount = Math.round(json.amount * 100) / 100;
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
          ].includes(json.payment_method ?? "")
            ? json.payment_method
            : "Efectivo";

          const { data: tx, error } = await supabase
            .from("transactions")
            .insert({
              user_id: user.id,
              category_id: category?.id ?? null,
              type: validType,
              amount: Math.round(amount * 100) / 100,
              detail: json.detail ?? "",
              bank: json.bank ?? "",
              payment_method: validPayment,
              owner: json.owner ?? "",
              ai_extracted: true,
              date: imageBase64 && !message?.trim() && isValidDate(json.date) ? json.date : transactionDate,
            })
            .select("*, category:categories(*)")
            .single();

          if (error || !tx) {
            console.error("Chat: no se pudo registrar la transacción", error);
            controller.enqueue(
              encoder.encode(
                "No se pudo guardar el movimiento. Revisa tus transacciones antes de volver a intentarlo."
              )
            );
            controller.close();
            return;
          }

          const typeLabel = tx.type === "ingreso" ? "Ingreso" : tx.type === "ahorro" ? "Ahorro" : "Gasto";
          const confirmMessage = `✓ ${typeLabel} registrado: ${formatCurrency(Number(tx.amount))} — ${tx.detail || category?.name || "Sin descripción"}`;

          controller.enqueue(encoder.encode(confirmMessage));
          if (validType === "egreso") await evaluateAlerts(supabase, user.id, [tx.date]);
          controller.enqueue(encoder.encode(`\n\n__FINAL_JSON__${JSON.stringify({ transaction: tx })}`));
          controller.close();

          return;
        }

        controller.enqueue(encoder.encode(parsed.text));
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
