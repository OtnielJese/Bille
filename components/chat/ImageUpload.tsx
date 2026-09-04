"use client";

import { useRef } from "react";
import { Paperclip, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  image: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  icon?: "plus" | "paperclip";
}

export function ImageUpload({
  image,
  onChange,
  disabled,
  icon = "paperclip",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {image ? (
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Vista previa"
            className="h-10 w-10 rounded-lg border object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow"
            aria-label="Quitar imagen"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
          )}
          aria-label="Adjuntar imagen"
          title="Adjuntar comprobante"
        >
          {icon === "plus" ? (
            <Plus className="h-5 w-5" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </button>
      )}
    </div>
  );
}
