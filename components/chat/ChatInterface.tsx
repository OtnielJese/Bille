"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, History } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/types";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Caché en memoria: conserva el historial mientras la sesión esté abierta
// y se reinicia al volver a cargar la página (sesión nueva).
const chatCache = new Map<string, ChatMessageType[]>();

const MARKER = "__FINAL_JSON__";

function parseTransaction(raw: string): ChatMessageType["transaction"] {
  const text = raw.trim();
  if (!text) return undefined;
  try {
    return JSON.parse(text)?.transaction ?? undefined;
  } catch {
    return undefined;
  }
}

const TYPE_CHIPS = ["gasto", "ingreso", "pago", "ahorro"];
const AMOUNT_CHIPS = ["S/ 5", "S/ 10", "S/ 20", "S/ 50", "S/ 100"];
const CATEGORY_CHIPS = [
  { emoji: "🍔", value: "comida" },
  { emoji: "🚗", value: "auto" },
  { emoji: "🔥", value: "gas" },
  { emoji: "⛽", value: "gasolina" },
  { emoji: "💡", value: "luz" },
  { emoji: "💧", value: "agua" },
  { emoji: "🏠", value: "cochera" },
  { emoji: "📅", value: "pago fijo" },
];

function addType(prev: string, type: string): string {
  const tokens = prev.trim().split(/\s+/);
  if (tokens.length && TYPE_CHIPS.includes(tokens[0].toLowerCase())) {
    tokens[0] = type;
    return tokens.join(" ");
  }
  return [type, prev.trim()].filter(Boolean).join(" ");
}

function addAmount(prev: string, amount: string): string {
  if (/S\/\s?\d+(\.\d+)?/i.test(prev)) {
    return prev.replace(/S\/\s?\d+(\.\d+)?/gi, amount);
  }
  return [prev.trim(), amount].filter(Boolean).join(" ");
}

function addCategory(prev: string, category: string): string {
  return [prev.trim(), category].filter(Boolean).join(" ");
}

export function ChatInterface({
  userId,
  userName,
  header,
}: {
  userId: string;
  userName: string;
  header?: React.ReactNode;
}) {
  const storageKey = `bille_chat_${userId}`;

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [history, setHistory] = useState<
    { id: string; role: string; content: string; created_at: string }[]
  >([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.messages ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const saveHistoryMessage = useCallback(
    async (role: "user" | "assistant", content: string) => {
      if (!content) return;
      try {
        await fetch("/api/chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, content }),
        });
      } catch {
        /* ignore */
      }
    },
    []
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Cargar historial de la sesión actual (solo en memoria)
  useEffect(() => {
    const cached = chatCache.get(storageKey);
    if (cached) {
      setMessages(cached);
    }
    setHydrated(true);
  }, [storageKey]);

  // Guardar el historial de cada petición en la sesión
  useEffect(() => {
    if (!hydrated) return;
    chatCache.set(storageKey, messages);
  }, [messages, hydrated, storageKey]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string, imageUrl: string | null) => {
      if (loading) return;
      if (!text.trim() && !imageUrl) return;

      const assistantId = crypto.randomUUID();

      const userMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        image_url: imageUrl,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        },
      ]);
      setInput("");
      setImage(null);
      setLoading(true);
      saveHistoryMessage("user", text.trim());

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            imageBase64: imageUrl,
            // Envía la fecha local del usuario (el servidor corre en UTC).
            localDate: (() => {
              const n = new Date();
              const y = n.getFullYear();
              const m = String(n.getMonth() + 1).padStart(2, "0");
              const d = String(n.getDate()).padStart(2, "0");
              return `${y}-${m}-${d}`;
            })(),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Error al procesar tu solicitud.");
        }

        if (!res.body) {
          throw new Error("Respuesta vacía.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        let transaction: ChatMessageType["transaction"];

        const apply = (
          content: string,
          tx?: ChatMessageType["transaction"]
        ) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content, transaction: tx ?? m.transaction }
                : m
            )
          );
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });

          const markerIdx = full.indexOf(MARKER);
          const textPart = markerIdx === -1 ? full : full.slice(0, markerIdx);
          let tx: ChatMessageType["transaction"];
          if (markerIdx !== -1) {
            tx = parseTransaction(full.slice(markerIdx + MARKER.length));
          }
          apply(textPart, tx);
        }

        full += decoder.decode();
        const markerIdx = full.indexOf(MARKER);
        const finalText = (
          markerIdx === -1 ? full : full.slice(0, markerIdx)
        ).trim();
        if (markerIdx !== -1) {
          transaction = parseTransaction(
            full.slice(markerIdx + MARKER.length)
          );
        }
        apply(finalText, transaction);

        saveHistoryMessage("assistant", finalText);
        loadHistory();

        if (transaction) {
          toast.success("Transacción registrada");
        }
      } catch (error: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `⚠️ ${error?.message ?? "Ocurrió un error. Inténtalo de nuevo."}`,
                }
              : m
          )
        );
        toast.error("No se pudo procesar tu mensaje");
      } finally {
        setLoading(false);
      }
    },
    [loading, saveHistoryMessage, loadHistory]
  );

  function startNewChat() {
    setMessages([]);
    setInput("");
    setImage(null);
    chatCache.delete(storageKey);
  }

  const extras = (
    <div className="mt-4 w-full space-y-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Tipo
          </span>
          {TYPE_CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => setInput((prev) => addType(prev, c))}
              className="rounded-full border border-[#0d9488]/30 bg-[#e0fbf6] px-3 py-1 text-xs font-semibold text-[#0d9488] transition-colors hover:border-[#0d9488]"
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Monto
          </span>
          {AMOUNT_CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => setInput((prev) => addAmount(prev, c))}
              className="rounded-full border bg-card px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:border-teal-400 hover:text-teal-600"
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Categoría
          </span>
          {CATEGORY_CHIPS.map((c) => (
            <button
              key={c.value}
              onClick={() => setInput((prev) => addCategory(prev, c.value))}
              className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-teal-400 hover:text-teal-600"
            >
              <span className="mr-1">{c.emoji}</span>
              {c.value}
            </button>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div className="rounded-2xl border bg-card p-3">
          <button
            onClick={() => setShowAllHistory((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              Historial reciente
            </span>
            <span className="flex items-center gap-1 text-[#0d9488]">
              {showAllHistory ? "Ver menos" : "Ver todos"}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  showAllHistory && "rotate-180"
                )}
              />
            </span>
          </button>
          <ul className="mt-2 space-y-1.5">
            {(showAllHistory ? history : history.slice(0, 3)).map((h) => (
              <li key={h.id} className="flex items-start gap-2 text-xs">
                <span
                  className={
                    h.role === "user"
                      ? "shrink-0 font-semibold text-[#3b82f6]"
                      : "shrink-0 font-semibold text-[#0d9488]"
                  }
                >
                  {h.role === "user" ? "Tú:" : "IA:"}
                </span>
                <span className="line-clamp-2 flex-1 text-muted-foreground">
                  {h.content}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const hasConversation = hydrated && (messages.length > 0 || loading);
  const canSubmit = !loading && (!!input.trim() || !!image);

  if (!hydrated) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-[#0d9488]" />
      </div>
    );
  }

  if (!hasConversation) {
    // Estado inicial: ventana centrada
    const firstName = (userName || "usuario").split(" ")[0];
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center overflow-y-auto px-4 py-8">
        <div className="m-auto flex w-full max-w-2xl flex-col items-center">
          <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Hola, {firstName}, ¿qué vamos a hacer?
          </h1>
          <div className="mt-8 w-full">
            <ChatComposer
              mode="centered"
              value={input}
              onChange={setInput}
              onSubmit={() => sendMessage(input, image)}
              image={image}
              onImageChange={setImage}
              disabled={loading}
              autoFocus
              canSubmit={canSubmit}
            />
          </div>
          {extras}
        </div>
      </div>
    );
  }

  // Conversación desplegada
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4">
          {header && <div className="py-4">{header}</div>}
          <div className="space-y-6 py-6">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} userName={userName} />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t bg-background/80 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <ChatComposer
            mode="conversation"
            value={input}
            onChange={setInput}
            onSubmit={() => sendMessage(input, image)}
            image={image}
            onImageChange={setImage}
            disabled={loading}
            canSubmit={canSubmit}
            onNewChat={startNewChat}
          />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
          {extras}
        </div>
      </div>
    </div>
  );
}