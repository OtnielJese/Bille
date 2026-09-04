"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, ChevronDown, Mic, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/chat/ImageUpload";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  image: string | null;
  onImageChange: (image: string | null) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  canSubmit: boolean;
  mode?: "centered" | "conversation";
  onNewChat?: () => void;
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  image,
  onImageChange,
  disabled,
  autoFocus,
  canSubmit,
  mode = "conversation",
  onNewChat,
}: ChatComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  const showSend = canSubmit;

  return (
    <div className="rounded-[28px] border bg-card p-2 shadow-violet-soft transition-shadow focus-within:ring-2 focus-within:ring-ring/30">
      <div className="flex items-center gap-1.5">
        {/* Izquierda: adjuntar (centrado) o nueva conversación + adjuntar */}
        {mode === "centered" ? (
          <ImageUpload
            image={image}
            onChange={onImageChange}
            disabled={disabled}
            icon="plus"
          />
        ) : (
          <>
            {onNewChat && (
              <button
                type="button"
                onClick={onNewChat}
                title="Nueva conversación"
                aria-label="Nueva conversación"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
            <ImageUpload
              image={image}
              onChange={onImageChange}
              disabled={disabled}
              icon="paperclip"
            />
          </>
        )}

        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === "centered"
              ? "Pregunta a Bille Pro"
              : "Escribe un mensaje o pregunta aquí..."
          }
          rows={1}
          className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
          disabled={disabled}
        />

        {/* Selector de modelo */}
        <button
          type="button"
          className="hidden h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted sm:flex"
          title="Modelo de IA"
        >
          <span className="h-2 w-2 rounded-full bg-[#0d9488]" />
          Pro
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {showSend ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || !canSubmit}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              disabled || !canSubmit
                ? "bg-muted text-muted-foreground/50"
                : "bg-[#0d9488] text-white hover:bg-[#0f766e]"
            )}
            aria-label="Enviar mensaje"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Dictado por voz (próximamente)"
            aria-label="Dictado por voz"
          >
            <Mic className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
