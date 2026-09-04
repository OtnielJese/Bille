import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Genera texto con Gemini (sin streaming). Devuelve la respuesta en texto plano.
 */
export async function generateText(
  systemInstruction: string,
  text: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta la variable GEMINI_API_KEY.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
    systemInstruction,
    generationConfig: {
      temperature: 0,
      thinkingConfig: { thinkingBudget: 128 },
    } as any,
  });

  const result = await model.generateContent(text);
  return result.response.text();
}

/** Extrae un JSON limpio de una respuesta de la IA. */
export function extractJson(text: string): any | null {
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
