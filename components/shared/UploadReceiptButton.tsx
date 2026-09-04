"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PENDING_IMAGE_KEY = "bille_pending_receipt";

/**
 * Botón "Subir comprobante": abre directamente el selector de archivos
 * y, al elegir la imagen, redirige al chat de IA con la imagen cargada.
 */
export function UploadReceiptButton({ className }: { className?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes (JPG, PNG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        sessionStorage.setItem(PENDING_IMAGE_KEY, reader.result as string);
      } catch {
        /* si sessionStorage falla, redirigimos igual sin imagen */
      }
      router.push("/chat");
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-1.5 h-4 w-4" />
        Subir comprobante
      </Button>
    </>
  );
}

/** Lee la imagen pendiente guardada desde el botón "Subir comprobante". */
export function consumePendingReceipt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const image = sessionStorage.getItem(PENDING_IMAGE_KEY);
    if (image) sessionStorage.removeItem(PENDING_IMAGE_KEY);
    return image;
  } catch {
    return null;
  }
}
