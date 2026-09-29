import { z } from "zod";

const transactionSchema = z.object({
  action: z.literal("add_transaction"),
  type: z.enum(["ingreso", "egreso", "ahorro"]),
  amount: z.number().finite().positive().max(9999999999.99).refine(value => Math.round(value * 100) > 0),
  category_id: z.string().nullish(),
  category_name: z.string().nullish(),
  detail: z.string().max(1000).nullish(),
  bank: z.string().max(200).nullish(),
  payment_method: z.string().nullish(),
  owner: z.string().max(200).nullish(),
  date: z.string().nullish(),
});

export type ChatResponse =
  | { kind: "transaction"; transaction: z.infer<typeof transactionSchema> }
  | { kind: "text"; text: string }
  | { kind: "invalid" };

/** Interpret the complete response before exposing any model output to the chat. */
export function parseChatResponse(raw: string): ChatResponse {
  const text = raw.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const value = JSON.parse(text.slice(start, end + 1));
      const parsed = transactionSchema.safeParse(value);
      return parsed.success ? { kind: "transaction", transaction: parsed.data } : { kind: "invalid" };
    } catch { /* Incomplete or malformed structured output must not reach the UI. */ }
  }
  if (!text || /^[{[]/.test(text) || /^```(?:json)?/i.test(text) || /"(?:action|category_id)"\s*:|add_transaction/.test(text)) {
    return { kind: "invalid" };
  }
  return { kind: "text", text };
}

/** Old history has no transaction ID: never claim that a model proposal was saved. */
export function readableAssistantHistory(content: string): string {
  if (!content) return content;
  const parsed = parseChatResponse(content);
  return parsed.kind === "text" ? content : "La IA devolvió datos de un movimiento. Revisa Transacciones para comprobar si quedó registrado.";
}

/** Network chunks can split the internal transaction marker at any character. */
export function visibleChatStreamText(full: string): string {
  const marker = "__FINAL_JSON__";
  const index = full.indexOf(marker);
  if (index !== -1) return full.slice(0, index);
  for (let length = Math.min(marker.length - 1, full.length); length > 0; length--) {
    if (full.endsWith(marker.slice(0, length))) return full.slice(0, -length);
  }
  return full;
}
