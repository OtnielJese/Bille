"use client";

import { useRef, useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
  userName: string;
}

export function ChatMessage({ message, userName }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full items-start gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar IA */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d9488] text-white">
          <Sparkles className="h-4 w-4" />
        </div>
      )}

      <div className={cn("max-w-[80%]", isUser ? "order-1" : "")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-[#0f1b35] text-white"
              : "rounded-tl-sm bg-muted text-foreground"
          )}
        >
          {message.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.image_url}
              alt="Comprobante adjunto"
              className="mb-2 max-h-56 w-full rounded-lg object-cover"
            />
          )}

          {!isUser && !message.content ? (
            <span className="flex items-center gap-1 py-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
            </span>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}

          {/* Mini card de transacción registrada */}
          {message.transaction && (
            <div
              className={cn(
                "mt-3 flex items-center gap-3 rounded-lg border p-3",
                isUser
                  ? "border-white/20 bg-white/10"
                  : "border-border bg-background"
              )}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                style={{
                  backgroundColor: `${message.transaction.category?.color ?? "#0d9488"}1a`,
                }}
              >
                {message.transaction.category?.icon ?? "📌"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {message.transaction.category?.name ?? "Sin categoría"}
                </p>
                <p className="truncate text-xs opacity-70">
                  {message.transaction.detail || "Transacción"} ·{" "}
                  {formatDate(message.transaction.date)}
                </p>
              </div>
              <span className="text-sm font-bold text-[#0d9488]">
                {formatCurrency(message.transaction.amount)}
              </span>
            </div>
          )}
        </div>

        <p
          className={cn(
            "mt-1 text-[11px] text-muted-foreground",
            isUser ? "text-right" : "text-left"
          )}
        >
          {formatDate(message.timestamp)}
        </p>
      </div>

      {/* Avatar usuario */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3b82f6] text-xs font-bold text-white">
          {(userName || "U").slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}
