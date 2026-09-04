"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SyncResult = {
  created: number;
  skipped: number;
  errors: number;
  transactions: { type: string; amount: number; detail: string }[];
};

/**
 * Botón que sincroniza los correos conectados (Gmail) para traer
 * nuevos gastos/pagos detectados en los emails del banco.
 * Al terminar muestra un modal pequeño con los resultados.
 */
export function SyncEmailButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo actualizar el correo");
        return;
      }
      setResult({
        created: data.created ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? 0,
        transactions: data.transactions ?? [],
      });
      setOpen(true);
      router.refresh();
    } catch {
      toast.error("No se pudo actualizar el correo");
    } finally {
      setSyncing(false);
    }
  }

  const incomes = result?.transactions.filter((t) => t.type === "ingreso") ?? [];
  const expenses = result?.transactions.filter((t) => t.type === "egreso") ?? [];

  return (
    <>
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border py-2 text-sm font-semibold text-primary transition-colors hover:bg-accent disabled:opacity-60"
      >
        {syncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        {syncing ? "Actualizando correo…" : "Actualizar correo"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Correo actualizado</DialogTitle>
            <DialogDescription>
              {result?.created
                ? `Se encontraron ${result.created} movimiento(s) nuevo(s).`
                : "Sin nuevos resultados."}
            </DialogDescription>
          </DialogHeader>

          {result && result.transactions.length > 0 && (
            <div className="space-y-2">
              {incomes.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ingresos ({incomes.length})
                  </p>
                  {incomes.map((t, i) => (
                    <div
                      key={`in-${i}`}
                      className="flex items-center gap-2 rounded-lg border bg-background p-2.5"
                    >
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {t.detail || "Ingreso"}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-emerald-600">
                        +{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {expenses.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Gastos ({expenses.length})
                  </p>
                  {expenses.map((t, i) => (
                    <div
                      key={`ex-${i}`}
                      className="flex items-center gap-2 rounded-lg border bg-background p-2.5"
                    >
                      <ArrowDownRight className="h-4 w-4 shrink-0 text-rose-500" />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {t.detail || "Gasto"}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-rose-600">
                        −{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {result.errors > 0 && (
                <p className="text-xs text-muted-foreground">
                  {result.errors} correo(s) no se pudieron procesar.
                </p>
              )}
            </div>
          )}

          {result && result.transactions.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <span className="text-3xl">📭</span>
              <p className="text-sm font-medium text-foreground">
                Sin nuevos resultados
              </p>
              <p className="text-xs text-muted-foreground">
                No se encontraron gastos ni ingresos nuevos en tus correos.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

