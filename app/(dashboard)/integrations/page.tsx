"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Landmark,
  Link2,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

const BANKS = ["BBVA", "BCP", "Interbank", "Scotiabank", "Banco de la Nación"];

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">Cargando...</div>}>
      <IntegrationsContent />
    </Suspense>
  );
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: number;
    synced_at?: string;
  } | null>(null);

  // Leer el resultado de la conexión OAuth al volver
  const connected = searchParams.get("connected");
  const error = searchParams.get("error");

  const handleResult = useCallback(
    (connectedParam: string | null, errorParam: string | null) => {
      if (connectedParam === "1") {
        toast.success("Gmail conectado correctamente");
      } else if (errorParam === "1") {
        toast.error("No se pudo conectar Gmail. Inténtalo de nuevo.");
      }
    },
    []
  );

  if (connected || error) {
    handleResult(connected, error);
  }

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo sincronizar");
        return;
      }
      setResult(data);
      toast.success(
        `Sincronización lista: ${data.created} nueva(s), ${data.skipped} omitida(s)`
      );
    } catch {
      toast.error("No se pudo sincronizar los correos");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integraciones</h1>
        <p className="text-muted-foreground">
          Conecta tus correos del banco para registrar gastos automáticamente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Gmail — correos del banco
          </CardTitle>
          <CardDescription>
            Lee únicamente los correos de los bancos listados abajo (no todo tu
            inbox) y registra las transacciones detectadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {BANKS.map((bank) => (
              <span
                key={bank}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                <Landmark className="h-3.5 w-3.5" />
                {bank}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/api/gmail/auth">
                <Link2 className="mr-1.5 h-4 w-4" />
                Conectar Gmail
              </Link>
            </Button>
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              {syncing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Sincronizar correos
            </Button>
          </div>

          {result && (
            <div className="space-y-1 rounded-xl border bg-muted/50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  {result.created} nueva(s) · {result.skipped} omitida(s) ·{" "}
                  {result.errors} error(es)
                </span>
              </div>
              {result.synced_at && (
                <p className="text-xs text-muted-foreground">
                  Última actualización:{" "}
                  {new Date(result.synced_at).toLocaleString("es-PE")}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
